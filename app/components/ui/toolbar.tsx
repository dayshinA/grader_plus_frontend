import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading,
  Highlighter,
  Italic,
  Link,
  Palette,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export type ToolbarFormat =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "link"
  | "heading"
  | "quote"
  | "highlight"
  | "color";

export type ToolbarTextAlign = "left" | "center" | "right";

type IconComponent = React.ComponentType<{ className?: string }>;

const FORMAT_BUTTONS: { format: ToolbarFormat; label: string; icon: IconComponent }[] = [
  { format: "bold", label: "Bold", icon: Bold },
  { format: "italic", label: "Italic", icon: Italic },
  { format: "underline", label: "Underline", icon: Underline },
  { format: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { format: "link", label: "Link", icon: Link },
  { format: "heading", label: "Heading", icon: Heading },
  { format: "quote", label: "Quote", icon: Quote },
];

const HIGHLIGHT_BUTTONS: { format: ToolbarFormat; label: string; icon: IconComponent }[] = [
  { format: "highlight", label: "Highlight", icon: Highlighter },
  { format: "color", label: "Change Color", icon: Palette },
];

const ALIGN_BUTTONS: { align: ToolbarTextAlign; label: string; icon: IconComponent }[] = [
  { align: "left", label: "Align Left", icon: AlignLeft },
  { align: "center", label: "Align Center", icon: AlignCenter },
  { align: "right", label: "Align Right", icon: AlignRight },
];

const ToolbarIconButton = ({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: IconComponent;
  isActive: boolean;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={isActive}
        className={cn(isActive && "bg-primary/10 hover:bg-primary/15")}
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

export interface ToolbarProps {
  /** When false, the toolbar animates out and unmounts. Default true. */
  visible?: boolean;
  /** Controlled active toggle formats. Omit to let the toolbar manage its own state. */
  activeFormats?: ToolbarFormat[];
  defaultActiveFormats?: ToolbarFormat[];
  onFormatToggle?: (format: ToolbarFormat) => void;
  /** Controlled text alignment. Omit to let the toolbar manage its own state. */
  textAlign?: ToolbarTextAlign;
  defaultTextAlign?: ToolbarTextAlign;
  onTextAlignChange?: (align: ToolbarTextAlign) => void;
  className?: string;
}

const Toolbar = ({
  visible = true,
  activeFormats: controlledActiveFormats,
  defaultActiveFormats = [],
  onFormatToggle,
  textAlign: controlledTextAlign,
  defaultTextAlign = "left",
  onTextAlignChange,
  className,
}: ToolbarProps) => {
  const [internalActiveFormats, setInternalActiveFormats] =
    React.useState<ToolbarFormat[]>(defaultActiveFormats);
  const [internalTextAlign, setInternalTextAlign] =
    React.useState<ToolbarTextAlign>(defaultTextAlign);

  const activeFormats = controlledActiveFormats ?? internalActiveFormats;
  const textAlign = controlledTextAlign ?? internalTextAlign;

  const handleFormatToggle = (format: ToolbarFormat) => {
    if (controlledActiveFormats === undefined) {
      setInternalActiveFormats((prev) =>
        prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
      );
    }
    onFormatToggle?.(format);
  };

  const handleTextAlignChange = (align: ToolbarTextAlign) => {
    if (controlledTextAlign === undefined) {
      setInternalTextAlign(align);
    }
    onTextAlignChange?.(align);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1 shadow-lg shadow-black/5",
            className,
          )}
        >
          {FORMAT_BUTTONS.map(({ format, label, icon }) => (
            <ToolbarIconButton
              key={format}
              label={label}
              icon={icon}
              isActive={activeFormats.includes(format)}
              onClick={() => handleFormatToggle(format)}
            />
          ))}

          <Separator orientation="vertical" className="h-8" />

          {HIGHLIGHT_BUTTONS.map(({ format, label, icon }) => (
            <ToolbarIconButton
              key={format}
              label={label}
              icon={icon}
              isActive={activeFormats.includes(format)}
              onClick={() => handleFormatToggle(format)}
            />
          ))}

          <Separator orientation="vertical" className="h-8" />

          {ALIGN_BUTTONS.map(({ align, label, icon }) => (
            <ToolbarIconButton
              key={align}
              label={label}
              icon={icon}
              isActive={textAlign === align}
              onClick={() => handleTextAlignChange(align)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Toolbar };
