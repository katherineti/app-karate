"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FormControl } from "./form"
import { useFormField as useShadcnFormField } from "./form"

type ComboboxItem = {
    value: string | number;
    label: React.ReactNode;
    searchValue?: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value?: string | number;
  onSelect: (value: string) => void;
  selectPlaceholder?: string;
  searchPlaceholder?: string;
  noResultsMessage?: string;
  className?: string;
  disabled?: boolean;
}

const useFormField = () => {
  try {
    return useShadcnFormField();
  } catch (e) {
    return {
      error: null,
      invalid: false,
      formItemId: undefined
    };
  }
}

export function Combobox({ 
    items, 
    value,
    onSelect,
    selectPlaceholder = "Select an item",
    searchPlaceholder = "Search items...",
    noResultsMessage = "No item found.",
    className,
    disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { error, invalid, ...formField } = useFormField()
  const isInsideFormControl = 'formItemId' in formField && formField.formItemId !== undefined;
  const hasItems = items && items.length > 0;

  const TriggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "w-full justify-between",
        !value && "text-muted-foreground",
        className
      )}
      data-invalid={!!invalid}
      disabled={!hasItems || disabled}
    >
      <div className="truncate flex-1 text-left">
        {hasItems
          ? (value
              ? items.find((item) => item.value.toString() === value.toString())?.label
              : selectPlaceholder)
          : noResultsMessage}
      </div>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isInsideFormControl ? <FormControl>{TriggerButton}</FormControl> : TriggerButton}
      </PopoverTrigger>
      {hasItems && (
         <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
                <CommandEmpty>{noResultsMessage}</CommandEmpty>
                <CommandGroup>
                {items.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.searchValue || (typeof item.label === 'string' ? item.label : String(item.value))}
                      onSelect={() => {
                          const selectedValue = item.value.toString();
                          onSelect(selectedValue === value?.toString() ? "" : selectedValue);
                          setOpen(false);
                      }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value?.toString() === item.value.toString() ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div className="flex-1">{item.label}</div>
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}
