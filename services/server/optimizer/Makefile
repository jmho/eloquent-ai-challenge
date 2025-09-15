optimize:
	python optimizer.py --train-csv train.csv --val-csv val.csv --model "openai/gpt-4o-mini" --save-path "optimized_rag.json"

test:
	python optimizer.py --test-model "optimized_rag.json" --query "A transaction I attempted failed or was declined. What should I do next?" --model "openai/gpt-4o-mini"