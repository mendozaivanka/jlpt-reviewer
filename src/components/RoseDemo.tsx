import { useState } from "react";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/lib/toast";
import ContrastSwitch from "./ContrastSwitch";
import ThemeMenu from "./ThemeMenu";

function Demo({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="label-mono font-sans font-medium normal-case tracking-[0.08em] uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2.5">{children}</CardContent>
    </Card>
  );
}

const runs = [
  { prompt: "summarise.prompt", version: "v9", cases: 120, pass: 114, delta: "+6" },
  { prompt: "triage.prompt", version: "v4", cases: 80, pass: 77, delta: "+2" },
  { prompt: "extract-invoice.prompt", version: "v2", cases: 60, pass: 51, delta: "−1" },
];

/** Every shadcn/ui component the site uses, live, in the Nordic Rose theme. */
export default function RoseDemo() {
  const [autoApprove, setAutoApprove] = useState(true);
  const [view, setView] = useState("chart");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Demo title="Button" className="md:col-span-2">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Delete</Button>
        <Button size="sm">Small</Button>
        <Button size="icon" aria-label="Sparkles">
          <SparklesIcon />
        </Button>
        <Button disabled>Disabled</Button>
      </Demo>

      <Demo title="Input · Select">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="demo-prompt">Prompt name</Label>
          <Input id="demo-prompt" placeholder="summarise.prompt" />
        </div>
        <div className="grid w-full gap-1.5">
          <Label htmlFor="demo-model">Model</Label>
          <Select defaultValue="large">
            <SelectTrigger id="demo-model" className="w-full">
              <SelectValue placeholder="Pick a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="large">Large model</SelectItem>
              <SelectItem value="medium">Medium model</SelectItem>
              <SelectItem value="small">Small model</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Demo>

      <Demo title="Tabs · Toggle group">
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="evals">Evals</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="prompt" className="pt-2 text-sm text-muted-foreground">
            The system prompt, versioned like code.
          </TabsContent>
          <TabsContent value="evals" className="pt-2 text-sm text-muted-foreground">
            120 cases, 4 graders, one number.
          </TabsContent>
          <TabsContent value="logs" className="pt-2 text-sm text-muted-foreground">
            Every call, with its tokens and latency.
          </TabsContent>
        </Tabs>
        <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v)} aria-label="View">
          <ToggleGroupItem value="chart">Chart</ToggleGroupItem>
          <ToggleGroupItem value="table">Table</ToggleGroupItem>
        </ToggleGroup>
      </Demo>

      <Demo title="Dialog · Toast · Switch">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ship prompt v9?</DialogTitle>
              <DialogDescription>
                Pass rate 95% on 120 cases, no regressions against v8. This replaces the live prompt for all users.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button onClick={() => toast.success("Prompt v9 is live")}>
                <CheckIcon /> Ship it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="secondary" onClick={() => toast("Saved to Prompt Garden")}>
          Show toast
        </Button>
        <Separator className="my-1" />
        <div className="flex items-center gap-2">
          <Switch id="demo-auto" checked={autoApprove} onCheckedChange={setAutoApprove} />
          <Label htmlFor="demo-auto">Auto-approve low-risk replies</Label>
        </div>
      </Demo>

      <Demo title="Badge · Kbd · Avatar">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge className="bg-rosas-2 text-foreground">Rosas</Badge>
        <Badge className="bg-fjord text-foreground">Fjord</Badge>
        <Badge className="bg-moss text-foreground">Moss</Badge>
        <Badge className="bg-sand text-foreground">Sand</Badge>
        <Badge className="bg-heather text-foreground">Heather</Badge>
        <Separator className="my-1" />
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <span className="text-sm text-muted-foreground">opens the command menu</span>
        <Avatar>
          <AvatarFallback className="bg-rosas-2 text-foreground">IV</AvatarFallback>
        </Avatar>
      </Demo>

      <Demo title="Theme controls">
        <ThemeMenu />
        <span className="text-sm text-muted-foreground">Light / Dark / System</span>
        <Separator className="my-1" />
        <ContrastSwitch />
      </Demo>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="label-mono font-sans font-medium tracking-[0.08em] uppercase">Table</CardTitle>
          <CardDescription>Latest eval runs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Cases</TableHead>
                <TableHead className="text-right">Pass</TableHead>
                <TableHead className="text-right">Δ vs previous</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.prompt}>
                  <TableCell className="font-mono text-xs">{r.prompt}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.version}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.cases}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.pass} <span className="text-muted-foreground">({Math.round((r.pass / r.cases) * 100)}%)</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-fjord-ink">{r.delta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Sample data, not real estimates.</CardFooter>
      </Card>
    </div>
  );
}
