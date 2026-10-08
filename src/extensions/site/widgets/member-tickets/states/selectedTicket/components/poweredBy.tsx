import classNames from "classnames";
import styles from './components.module.css';

export const PoweredBy = () => {
    return (
         <div className={classNames("footerPoweredBy", styles.footerPoweredBy)}>Powered by <b>My Tickets</b></div>
    )
}