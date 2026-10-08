import classNames from "classnames"
import styles from "./components.module.css"

interface SearchInputProps {
    value: string
    onInput: (e: React.FormEvent<HTMLInputElement>) => void
}

export const SearchInput = ({value, onInput}: SearchInputProps) => {
    return (
        <input className={classNames("ticketSearchInput", styles.ticketSearchInput)} value={value} onInput={onInput} placeholder="Search tickets…" readOnly aria-readonly="true" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} />
    )
}
