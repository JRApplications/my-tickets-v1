import classNames from "classnames"
import { useEffect, useRef, useState } from "react"
import styles from "./components.module.css";
import { ChevronDown } from '@wix/wix-ui-icons-common';

const OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
]

export const Dropdown = ({ disabled = false }: { disabled?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selected, setSelected] = useState<string | null>(null)
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

    const selectedOption = OPTIONS.find((o) => o.value === selected)

    return (
        <div className={classNames("statusDropdown", styles.statusDropdown)} id="statusDropdown" ref={rootRef}>
            <div
                className={classNames(styles.selectBtn, { [styles.open]: isOpen })}
                tabIndex={disabled ? -1 : 0}
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
                    {selectedOption ? selectedOption.label : "Select Status"}
                </span>
                <span className={styles.chevron}><ChevronDown /></span>
            </div>
            <div className={classNames(styles.menu, { [styles.open]: isOpen })} id="menu">
                {OPTIONS.map((item) => (
                    <div
                        key={item.value}
                        className={classNames(styles.menuItem, { [styles.active]: selected === item.value })}
                        data-value={item.value}
                        onClick={() => {
                            if (disabled) return
                            setSelected(item.value)
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
