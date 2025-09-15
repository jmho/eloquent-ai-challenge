import { Brain, FileText, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ReasoningPopoverProps {
  reasoning?: string;
  sources?: Array<{ title: string; url: string; excerpt?: string }>;
}

export function ReasoningPopover({
  reasoning,
  sources,
}: ReasoningPopoverProps) {
  if (!reasoning && (!sources || sources.length === 0)) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground"
        >
          <Info className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-auto" align="start">
        <Tabs defaultValue="reasoning" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reasoning" disabled={!reasoning}>
              <Brain className="w-4 h-4 mr-1" />
              Reasoning
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              disabled={!sources || sources.length === 0}
            >
              <FileText className="w-4 h-4 mr-1" />
              Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="reasoning"
            className="mt-4 max-h-80 overflow-auto"
          >
            {reasoning ? (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Thought process</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {reasoning}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No reasoning available for this response.
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="mt-4 max-h-80 overflow-auto">
            {sources && sources.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Sources used</h4>
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div key={index} className="border rounded-md p-2">
                      <div className="font-medium text-sm mb-1">
                        {source.title}
                      </div>
                      {source.excerpt && (
                        <div className="text-xs text-muted-foreground mb-1">
                          "{source.excerpt}"
                        </div>
                      )}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {source.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No sources available for this response.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
