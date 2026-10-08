import classNames from 'classnames';
import styles from './messages.module.css';

export const MemberMessage = ({ message }: { message: string }) => {
    return (
        <div className={classNames('__MessageSecondaryContainer', styles.__MessageSecondaryContainer)}>
            <div className={classNames('__MessageSecondaryHeader', styles.__MessageSecondaryHeader)}>
                <p className={classNames('__CustomerName', styles.__CustomerName)}>Me</p>
            </div>
            <div className={classNames('__MessageSecondary', styles.__MessageSecondary)}>
                <p>{message}</p>
            </div>
        </div>
    )
}
