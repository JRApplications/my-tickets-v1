import classNames from "classnames"
import { useEffect, useRef, useState } from "react"
import styles from "./components.module.css";
import { ChevronDown } from '@wix/wix-ui-icons-common';
import { STATUS_OPTIONS } from '@jrapps/my_tickets_common_types';

const OPTIONS = [
    { value: "", label: "All Statuses" },
    ...STATUS_OPTIONS.map(({ id, value }) => ({ value: id, label: value })),
];

export const Dropdown = ({ disabled = false, value = "", onChange }: { disabled?: boolean; value?: string; onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    const closeMenu = () => setIsOpen(false)

    useEffect(() => {
        if (!isOpen) return

        const handleOutsideClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                closeMenu()
            }
        }

        document.addEventListener("click", handleOutsideClick)
        return () => document.removeEventListener("click", handleOutsideClick)
    }, [isOpen])

    const handleBtnKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsOpen((open) => !open)
        } else if (e.key === "Escape") {
            closeMenu()
        }
    }

    const selectedOption = OPTIONS.find((o) => o.value === value)

    return (
        <div className={classNames("statusDropdown", styles.statusDropdown)} id="statusDropdown" ref={rootRef}>
            <div
                className={classNames(styles.selectBtn, { [styles.open]: isOpen })}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                id="selectBtn"
                onClick={(e) => {
                    if (disabled) return
                    e.stopPropagation()
                    setIsOpen((open) => !open)
                }}
                onKeyDown={handleBtnKeyDown}
            >
                <span id="selectLabel">
                    {selectedOption?.label ?? "All Statuses"}
                </span>
                <span className={styles.chevron}><ChevronDown /></span>
            </div>
            <div className={classNames(styles.menu, { [styles.open]: isOpen })} id="menu" role="listbox" aria-label="Filter tickets by status">
                {OPTIONS.map((item) => (
                    <div
                        key={item.value}
                        className={classNames(styles.menuItem, { [styles.active]: value === item.value })}
                        role="option"
                        aria-selected={value === item.value}
                        tabIndex={isOpen && !disabled ? 0 : -1}
                        data-value={item.value}
                        onClick={() => {
                            if (disabled) return
                            onChange(item.value)
                            closeMenu()
                        }}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    )
}
