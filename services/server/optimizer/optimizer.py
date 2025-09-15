"""DSPy optimizer configuration and training."""
import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

import dspy

sys.path.append(str(Path(__file__).parent.parent))

from app.services.rag import RAG
from app.services.retriever import PineconeRetriever
from dspy.evaluate import SemanticF1

logger = logging.getLogger(__name__)


class RAGOptimizer:
    """
    Handles optimization of RAG modules using DSPy optimizers.
    """
    
    def __init__(
        self,
        retriever: Any,
        model_name: str = "openai/gpt-4o",
        optimizer_type: Literal['bootstrap'] = "bootstrap",
        metric_type: Literal['semantic_f1'] = "semantic_f1"
    ):
        """
        Initialize the RAG optimizer.
        
        Args:
            retriever: The retriever instance to use
            model_name: DSPy language model to use
            optimizer_type: Type of optimizer ('mipro_v2', 'bootstrap', 'copro')
            metric_type: Type of metric ('semantic_f1', 'composite')
        """
        self.retriever = retriever
        self.model_name = model_name
        self.optimizer_type = optimizer_type
        self.metric_type = metric_type
        
        # Set up DSPy LM
        self.lm = dspy.LM(model_name)
        dspy.configure(lm=self.lm)
        
        # Set up metric
        if metric_type == "semantic_f1":
            self.metric = SemanticF1(decompositional=True)
        else:
            raise ValueError(f"Unknown metric type: {metric_type}")
            
        logger.info(f"Initialized RAG optimizer with {model_name} and {metric_type} metric")
        
    def prepare_examples(
        self,
        questions: List[str],
        responses: List[str],
 
    ) -> List[dspy.Example]:
        """
        Convert raw data into DSPy examples.
        
        Args:
            questions: List of questions
            responses: List of ground truth responses
            input_keys: Keys to mark as inputs (default: ['question'])
            
        Returns:
            List of DSPy examples
        """
        if len(questions) != len(responses):
            raise ValueError("Questions and responses must have same length")
            
            
        examples = []
        for question, response in zip(questions, responses):
            example = dspy.Example(
                question=question,
                response=response
            ).with_inputs('question')
            examples.append(example)
            
        logger.info(f"Prepared {len(examples)} examples")
        return examples
    
    def create_module(self) -> dspy.Module:
        """
        Create a RAG module for optimization.
            
        Returns:
            DSPy module instance
        """

        return RAG(PineconeRetriever())
    
    def optimize(
        self,
        module: dspy.Module,
        trainset: List[dspy.Example],
        max_bootstrapped_demos: int = 1,
        max_labeled_demos: int = 3,
    ) -> dspy.Module:
        """
        Optimize a DSPy module using the configured optimizer.
        
        Args:
            module: The module to optimize
            trainset: Training examples
            valset: Validation examples (optional)
            max_bootstrapped_demos: Max bootstrapped demonstrations
            max_labeled_demos: Max labeled demonstrations
            num_threads: Number of threads for optimization
            auto_setting: Auto setting for MIPROv2 ('light', 'medium', 'heavy')
            
        Returns:
            Optimized module
        """
        logger.info(f"Starting optimization with {self.optimizer_type}")
        
        if self.optimizer_type == "bootstrap":
            optimizer = dspy.BootstrapFewShot(
                metric=self.metric,
                max_bootstrapped_demos=max_bootstrapped_demos,
                max_labeled_demos=max_labeled_demos
            )
            
            optimized_module = optimizer.compile(
                module,
                trainset=trainset,
            )
            
        else:
            raise ValueError(f"Unknown optimizer type: {self.optimizer_type}")
            
        logger.info("Optimization completed")
        return optimized_module
    
    def evaluate(
        self,
        module: dspy.Module,
        dataset: List[dspy.Example],
        num_threads: int = 4,
        display_progress: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate a module on a dataset.
        
        Args:
            module: The module to evaluate
            dataset: List of examples to evaluate on
            num_threads: Number of threads for evaluation
            display_progress: Whether to show progress bar
            
        Returns:
            Evaluation results
        """
        logger.info(f"Evaluating module on {len(dataset)} examples")
        
        evaluator = dspy.Evaluate(
            devset=dataset,
            metric=self.metric,
            num_threads=num_threads,
            display_progress=display_progress,
            display_table=2
        )
        
        score = evaluator(module)
        
        # Convert score to float if it's an EvaluationResult object
        if hasattr(score, '__float__'):
            average_score = float(score)
        elif isinstance(score, (int, float)):
            average_score = float(score)
        else:
            # If score has an average attribute or similar
            average_score = getattr(score, 'average', 0.0)
        
        results = {
            'average_score': average_score,
            'num_examples': len(dataset),
            'metric_type': self.metric_type,
            'model_name': self.model_name
        }
        
        logger.info(f"Evaluation completed. Average score: {average_score:.3f}")
        return results
    
    def save_module(self, module: dspy.Module, filepath: str) -> None:
        """
        Save an optimized module to disk.
        
        Args:
            module: The module to save
            filepath: Path to save the module
        """
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        module.save(filepath)
        logger.info(f"Saved module to {filepath}")
    
    def load_module(self, filepath: str) -> dspy.Module:
        """
        Load an optimized module from disk.
        
        Args:
            module_type: Type of module to create before loading
            filepath: Path to load the module from
            
        Returns:
            Loaded module
        """
        module = self.create_module()
        module.load(filepath)
        logger.info(f"Loaded module from {filepath}")
        return module
    
    def get_cost(self) -> float:
        """
        Get the total cost of LM calls during optimization.
        
        Returns:
            Total cost in USD
        """
        try:
            cost = sum([x['cost'] for x in self.lm.history if x['cost'] is not None])
            return cost
        except Exception as e:
            logger.error(f"Error calculating cost: {e}")
            return 0.0


def run_optimization_pipeline(
    retriever: Any,
    training_data: List[Tuple[str, str]],  # (question, response) pairs
    validation_data: Optional[List[Tuple[str, str]]] = None,
    test_data: Optional[List[Tuple[str, str]]] = None,
    save_path: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Run a complete optimization pipeline.
    
    Args:
        retriever: The retriever instance
        training_data: List of (question, response) tuples for training
        validation_data: List of (question, response) tuples for validation
        test_data: List of (question, response) tuples for testing
        save_path: Path to save the optimized module
        **kwargs: Additional arguments for RAGOptimizer
        
    Returns:
        Dictionary with results including scores and costs
    """
    # Initialize optimizer
    optimizer = RAGOptimizer(retriever=retriever, **kwargs)
    
    # Prepare data
    questions, responses = zip(*training_data)
    trainset = optimizer.prepare_examples(list(questions), list(responses))
    
    valset = None
    if validation_data:
        val_questions, val_responses = zip(*validation_data)
        valset = optimizer.prepare_examples(list(val_questions), list(val_responses))
    
    testset = None
    if test_data:
        test_questions, test_responses = zip(*test_data)
        testset = optimizer.prepare_examples(list(test_questions), list(test_responses))
    
    # Create and evaluate baseline
    baseline_module = optimizer.create_module()
    baseline_score = optimizer.evaluate(baseline_module, valset or trainset)
    
    # Optimize the module
    optimized_module = optimizer.optimize(baseline_module, trainset)
    optimized_score = optimizer.evaluate(optimized_module, valset or trainset)
    
    # Test evaluation if provided
    test_score = None
    if testset:
        test_score = optimizer.evaluate(optimized_module, testset)
    
    # Save if path provided
    if save_path:
        optimizer.save_module(optimized_module, save_path)
    
    # Calculate cost
    total_cost = optimizer.get_cost()
    
    results = {
        'baseline_score': baseline_score,
        'optimized_score': optimized_score,
        'test_score': test_score,
        'improvement': optimized_score['average_score'] - baseline_score['average_score'],
        'total_cost_usd': total_cost,
        'training_examples': len(trainset),
        'validation_examples': len(valset) if valset else 0,
        'test_examples': len(testset) if testset else 0,
    }
    
    logger.info(f"Optimization pipeline completed. Improvement: {results['improvement']:.3f}")
    return results


def load_csv_data(train_csv: str, val_csv: str) -> Tuple[List[Tuple[str, str]], List[Tuple[str, str]]]:
    """
    Load training and validation data from CSV files.
    
    Args:
        train_csv: Path to training CSV file with 'question' and 'answer' columns
        val_csv: Path to validation CSV file with 'question' and 'answer' columns
        
    Returns:
        Tuple of (train_data, val_data) as lists of (question, answer) tuples
    """
    import csv
    
    def load_csv(filepath: str) -> List[Tuple[str, str]]:
        data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Handle both capitalized and lowercase column names
                question = (row.get('Question') or row.get('question', '')).strip()
                answer = (row.get('Answer') or row.get('answer', '')).strip()
                if question and answer:
                    data.append((question, answer))
        return data
    
    train_data = load_csv(train_csv)
    val_data = load_csv(val_csv)
    
    logger.info(f"Loaded {len(train_data)} training examples from {train_csv}")
    logger.info(f"Loaded {len(val_data)} validation examples from {val_csv}")
    
    return train_data, val_data


def test_optimized_model(
    model_path: str,
    test_query: str,
    model_name: str = "openai/gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Load an optimized model and test it against a query.
    
    Args:
        model_path: Path to the optimized model JSON file
        test_query: Query to test the model with
        model_name: DSPy model to use for inference
        
    Returns:
        Dictionary with test results
    """
    logger.info(f"Loading optimized model from {model_path}")
    
    # Initialize optimizer to load the model
    optimizer = RAGOptimizer(
        retriever=PineconeRetriever(),
        model_name=model_name
    )
    
    # Load the optimized model
    optimized_model = optimizer.load_module(model_path)
    
    # Run the query
    logger.info(f"Testing query: '{test_query}'")
    result = optimized_model(test_query)
    
    # Extract response details
    response_data = {
        'query': test_query,
        'response': result.response,
        'reasoning': getattr(result, 'reasoning', 'Not available'),
        'num_contexts': len(result.contexts),
        'contexts': [
            {
                'text': ctx.text[:200] + '...' if len(ctx.text) > 200 else ctx.text,
                'score': ctx.score,
                'category': ctx.category
            }
            for ctx in result.contexts
        ],
        'cost_usd': optimizer.get_cost()
    }
    
    logger.info(f"Response generated. Cost: ${response_data['cost_usd']:.4f}")
    return response_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DSPy RAG Optimization")
    parser.add_argument("--train-csv", help="Path to training CSV file")
    parser.add_argument("--val-csv", help="Path to validation CSV file")
    parser.add_argument("--model", default="openai/gpt-4o-mini", help="Model to use")
    parser.add_argument("--save-path", default="./optimized_rag.json", help="Path to save optimized model")
    parser.add_argument("--use-kfold", action="store_true", help="Use k-fold cross-validation")
    parser.add_argument("--k-folds", type=int, default=5, help="Number of folds for k-fold CV")
    
    # Test mode arguments
    parser.add_argument("--test-model", help="Path to optimized model to test")
    parser.add_argument("--query", help="Query to test the model with")
    
    args = parser.parse_args()
    
    try:
        if args.test_model and args.query:
            # Test mode
            logger.info("Running in test mode")
            test_results = test_optimized_model(
                model_path=args.test_model,
                test_query=args.query,
                model_name=args.model
            )
            
            # Display test results
            print("\n🧪 Model Test Results")
            print(f"Query: {test_results['query']}")
            print(f"Response: {test_results['response']}")
            print(f"Reasoning: {test_results['reasoning']}")
            print(f"Contexts Retrieved: {test_results['num_contexts']}")
            print(f"Cost: ${test_results['cost_usd']:.4f}")
            
            if test_results['contexts']:
                print("\n📄 Retrieved Contexts:")
                for i, ctx in enumerate(test_results['contexts'], 1):
                    print(f"  {i}. [Score: {ctx['score']:.3f}] {ctx['text']}")
            
        elif args.train_csv and args.val_csv:
            # Training mode
            # Load data from CSV files
            train_data, val_data = load_csv_data(args.train_csv, args.val_csv)
            
            # Standard single-split optimization
            logger.info("Using standard train/val split")
            
            results = run_optimization_pipeline(
                retriever=PineconeRetriever(),
                training_data=train_data,
                validation_data=val_data,
                save_path=args.save_path,
                model_name=args.model
            )
            
            # Display results
            print("\n🎉 Optimization Complete!")
            print(f"Baseline Score: {results['baseline_score']['average_score']:.3f}")
            print(f"Optimized Score: {results['optimized_score']['average_score']:.3f}")
            print(f"Improvement: {results['improvement']:.3f}")
            print(f"Cost: ${results['total_cost_usd']:.2f}")
            print(f"Model saved to: {args.save_path}")
            
        else:
            print("Error: Either provide --train-csv and --val-csv for training, or --test-model and --query for testing")
            parser.print_help()
        
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        raise