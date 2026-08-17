import { ChevronsDownUp } from "lucide-react"

import {
  CollapseButton,
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from "~/components/ui/file-tree"

const ELEMENTS: TreeViewElement[] = [
  {
    id: "1",
    name: "submissions",
    children: [
      {
        id: "2",
        name: "B123456",
        children: [
          { id: "3", name: "report.pdf" },
          { id: "4", name: "appendix.pdf" },
        ],
      },
      {
        id: "5",
        name: "B234567",
        children: [{ id: "6", name: "report.pdf" }],
      },
      {
        id: "7",
        name: "B345678",
        children: [
          { id: "8", name: "report.pdf" },
          { id: "9", name: "source-code.zip" },
        ],
      },
    ],
  },
]

export function FileTreeDemo() {
  return (
    <div className="relative flex h-[300px] flex-col overflow-hidden rounded-lg border bg-background md:w-1/2">
      <Tree
        className="overflow-hidden rounded-md bg-background p-2"
        initialSelectedId="6"
        elements={ELEMENTS}
      >
        <Folder element="submissions" value="1">
          <Folder element="B123456" value="2">
            <File value="3">
              <p>report.pdf</p>
            </File>
            <File value="4">
              <p>appendix.pdf</p>
            </File>
          </Folder>
          <Folder element="B234567" value="5">
            <File value="6">
              <p>report.pdf</p>
            </File>
          </Folder>
          <Folder element="B345678" value="7">
            <File value="8">
              <p>report.pdf</p>
            </File>
            <File value="9">
              <p>source-code.zip</p>
            </File>
          </Folder>
        </Folder>
        <CollapseButton elements={ELEMENTS} title="Expand or collapse all">
          <ChevronsDownUp className="size-4" />
        </CollapseButton>
      </Tree>
    </div>
  )
}
