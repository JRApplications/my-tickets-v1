import classNames from 'classnames';
import styles from './messages.module.css';

export const MemberMessage = ({ message, designId }: { message: string, designId: string }) => {
    return (
        <div className={classNames('__MessageSecondaryContainer', styles.__MessageSecondaryContainer)}>
            <div className={classNames('__MessageSecondaryHeader', styles.__MessageSecondaryHeader)}>
                <p className={classNames('__CustomerName', styles.__CustomerName)} data-design-element="memberName" data-design-id={`${designId}-name`}>Me</p>
            </div>
            <div className={classNames('__MessageSecondary', styles.__MessageSecondary)} data-design-element="memberBubble" data-design-id={`${designId}-bubble`}>
                <p>{message}</p>
            </div>
        </div>
    )
}
