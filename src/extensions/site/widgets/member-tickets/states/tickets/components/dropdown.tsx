import classNames from "classnames"
import { useEffect, useId, useRef, useState } from "react"
import styles from "./components.module.css";
import { ChevronDown } from '@wix/wix-ui-icons-common';
import { STATUS_OPTIONS } from '@jrapps/my_tickets_common_types';

const OPTIONS = [
    { value: "", label: "All Statuses" },
    ...STATUS_OPTIONS.map(({ id, value }) => ({ value: id, label: value })),
];

export const Dropdown = ({ value = "", onChange }: { value?: string; onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false)
    const selectedIndex = Math.max(0, OPTIONS.findIndex((option) => option.value === value))
    const [activeIndex, setActiveIndex] = useState(selectedIndex)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const optionRefs = useRef<Array<HTMLDivElement | null>>([])
    const listboxId = useId()

    const closeMenu = (restoreFocus = false) => {
        setIsOpen(false)
        if (restoreFocus) triggerRef.current?.focus()
    }

    const openMenu = (index = selectedIndex) => {
        setActiveIndex(index)
        setIsOpen(true)
    }

    const selectOption = (optionValue: string) => {
        onChange(optionValue)
        closeMenu(true)
    }

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault()
            if (!isOpen) openMenu(selectedIndex)
        } else if (event.key === "ArrowUp") {
            event.preventDefault()
            if (!isOpen) openMenu(selectedIndex)
        } else if (event.key === "Escape" && isOpen) {
            event.preventDefault()
            closeMenu(true)
        }
    }

    const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
        let nextIndex: number | undefined;
        if (event.key === "ArrowDown") nextIndex = (index + 1) % OPTIONS.length;
        else if (event.key === "ArrowUp") nextIndex = (index - 1 + OPTIONS.length) % OPTIONS.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = OPTIONS.length - 1;
        else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            selectOption(OPTIONS[index].value)
            return
        } else if (event.key === "Escape") {
            event.preventDefault()
            closeMenu(true)
            return
        } else if (event.key === "Tab") {
            closeMenu()
            return
        }

        if (nextIndex !== undefined) {
            event.preventDefault()
            setActiveIndex(nextIndex)
            optionRefs.current[nextIndex]?.focus()
        }
    }

    useEffect(() => {
        if (!isOpen) return

        const handleOutsideClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                closeMenu(rootRef.current.contains(document.activeElement))
            }
        }

        document.addEventListener("click", handleOutsideClick)
        return () => document.removeEventListener("click", handleOutsideClick)
    }, [isOpen])

    useEffect(() => {
        if (isOpen) optionRefs.current[activeIndex]?.focus()
    }, [isOpen, activeIndex])

    const selectedOption = OPTIONS.find((o) => o.value === value)

    return (
        <div className={classNames("statusDropdown", styles.statusDropdown)} ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                className={classNames(styles.selectBtn, { [styles.open]: isOpen })}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={`${listboxId}-listbox`}
                onClick={() => isOpen ? closeMenu() : openMenu()}
                onKeyDown={handleTriggerKeyDown}
            >
                <span>
                    {selectedOption?.label ?? "All Statuses"}
                </span>
                <span className={styles.chevron}><ChevronDown /></span>
            </button>
            <div className={classNames(styles.menu, { [styles.open]: isOpen })} id={`${listboxId}-listbox`} role="listbox" aria-label="Filter tickets by status" aria-hidden={!isOpen}>
                {OPTIONS.map((item, index) => (
                    <div
                        key={item.value}
                        ref={(element) => { optionRefs.current[index] = element }}
                        id={`${listboxId}-option-${index}`}
                        className={classNames(styles.menuItem, {
                            [styles.active]: value === item.value,
                            [styles.highlighted]: activeIndex === index,
                        })}
                        role="option"
                        aria-selected={value === item.value}
                        tabIndex={isOpen && activeIndex === index ? 0 : -1}
                        data-value={item.value}
                        onFocus={() => setActiveIndex(index)}
                        onKeyDown={(event) => handleOptionKeyDown(event, index)}
                        onClick={() => selectOption(item.value)}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    )
}
