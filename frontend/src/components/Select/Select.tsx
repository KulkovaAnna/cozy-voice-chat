import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ChevronUpIcon } from "../Icons";
import * as Styles from "./Select.styles";
import type {
  SelectBaseOption,
  SelectOption,
  SelectOptionGroup,
  SelectProps,
} from "./types";

const isGroup = (option: SelectOption): option is SelectOptionGroup =>
  "options" in option;

export const Select = (props: SelectProps) => {
  const {
    options,
    value,
    onChange,
    placeholder = "—",
    disabled = false,
    className,
    id,
    "aria-label": ariaLabel,
  } = props;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Плоский список выбираемых опций — для навигации и поиска выбранной.
  const flatOptions = useMemo(() => {
    const result: SelectBaseOption[] = [];

    for (const option of options) {
      if (isGroup(option)) {
        result.push(...option.options);
      } else {
        result.push(option);
      }
    }

    return result;
  }, [options]);

  const indexByValue = useMemo(() => {
    const map = new Map<string, number>();
    flatOptions.forEach((option, index) => map.set(option.value, index));
    return map;
  }, [flatOptions]);

  const safeIndex = Math.min(activeIndex, Math.max(flatOptions.length - 1, 0));
  const selectedOption = flatOptions.find((option) => option.value === value);

  // Закрываем дропдаун по клику вне селекта.
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Прокручиваем активную опцию в видимую зону.
  useEffect(() => {
    if (!open) return;

    const item = optionsRef.current?.querySelector<HTMLElement>(
      `[data-index="${safeIndex}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [open, safeIndex]);

  const closeAndFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const commitOption = (option: SelectBaseOption) => {
    onChange(option.value);
    closeAndFocus();
  };

  // Открываем список и подсвечиваем текущее значение.
  const openList = () => {
    const currentIndex = flatOptions.findIndex(
      (option) => option.value === value,
    );
    setActiveIndex(Math.max(currentIndex, 0));
    setOpen(true);
  };

  const handleTriggerClick = () => {
    if (disabled) return;

    if (open) {
      setOpen(false);
    } else {
      openList();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeAndFocus();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, flatOptions.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(flatOptions.length - 1);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const option = flatOptions[safeIndex];
        if (option) commitOption(option);
        break;
      }
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const renderOption = (option: SelectBaseOption) => {
    const index = indexByValue.get(option.value) ?? -1;
    const selected = option.value === value;

    return (
      <Styles.Option
        key={option.value}
        id={`${listId}-option-${index}`}
        role="option"
        data-index={index}
        aria-selected={selected}
        $active={index === safeIndex}
        $selected={selected}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => commitOption(option)}
      >
        {option.label}
      </Styles.Option>
    );
  };

  return (
    <Styles.Root ref={rootRef} className={className}>
      <Styles.Trigger
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-disabled={disabled || undefined}
        aria-activedescendant={
          open ? `${listId}-option-${safeIndex}` : undefined
        }
        disabled={disabled}
        $open={open}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        {selectedOption ? (
          <Styles.Value>{selectedOption.label}</Styles.Value>
        ) : (
          <Styles.Placeholder>{placeholder}</Styles.Placeholder>
        )}
        <Styles.ChevronWrap $open={open}>
          <ChevronUpIcon />
        </Styles.ChevronWrap>
      </Styles.Trigger>

      <Styles.Options
        ref={optionsRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        aria-hidden={!open}
        $open={open}
      >
        {options.map((option) =>
          isGroup(option) ? (
            <Styles.Group
              key={option.label}
              role="group"
              aria-label={option.label}
            >
              <Styles.GroupLabel>{option.label}</Styles.GroupLabel>
              {option.options.map(renderOption)}
            </Styles.Group>
          ) : (
            renderOption(option)
          ),
        )}
      </Styles.Options>
    </Styles.Root>
  );
};
