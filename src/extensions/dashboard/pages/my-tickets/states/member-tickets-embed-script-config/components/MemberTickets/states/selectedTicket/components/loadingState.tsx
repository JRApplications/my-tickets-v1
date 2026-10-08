import './loadingState.css';
import classNames from 'classnames';

export const LoadingState = () => {
    return (
        <div className={classNames('selectedTicketLoadingState')}>
            <div className="header">
                <div className="skel skel-back" data-design-element="loadingSkeleton" data-design-id="selected-ticket-loading-skeleton"></div>
                <div className="skel skel-title"></div>
            </div>

            <div className="thread">
                <div className="msg-group in">
                    <div className="skel skel-sender"></div>
                    <div className="skel skel-bubble" style={{ width: '220px' }}></div>
                </div>

                <div className="msg-group out">
                    <div className="skel skel-sender"></div>
                    <div className="skel skel-bubble" style={{ width: '260px' }}></div>
                </div>

                <div className="msg-group out">
                    <div className="skel skel-bubble" style={{ width: '180px' }}></div>
                </div>

                <div className="msg-group in">
                    <div className="skel skel-sender"></div>
                    <div className="skel skel-bubble" style={{ width: '150px' }}></div>
                </div>
            </div>

            <div className="composer">
                <div className="composer-row">
                    <div className="skel skel-input"></div>
                    <div className="skel skel-send"></div>
                </div>
            </div>
            <div className="footer">
                <div className="skel skel-footer"></div>
            </div>
        </div>
    )
}
