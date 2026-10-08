import './loadingState.css';
import classNames from 'classnames';

export const LoadingState = () => {
    return (
        <div className={classNames('loadingState')}>
            <div className="toolbar">
                <div className="skel skel-select" data-design-element="loadingSkeleton" data-design-id="tickets-loading-skeleton"></div>
                <div className="skel skel-search"></div>
            </div>

            <div className="list">
                <div className="card">
                    <div className="card-left">
                        <div className="skel skel-id"></div>
                        <div className="skel skel-subject"></div>
                        <div className="skel skel-status"></div>
                    </div>
                    <div className="card-right">
                        <div className="skel skel-meta"></div>
                        <div className="skel skel-arrow"></div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-left">
                        <div className="skel skel-id"></div>
                        <div className="skel skel-subject" style={{width: "60%"}}></div>
                        <div className="skel skel-status"></div>
                    </div>
                    <div className="card-right">
                        <div className="skel skel-meta"></div>
                        <div className="skel skel-arrow"></div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-left">
                        <div className="skel skel-id"></div>
                        <div className="skel skel-subject" style={{width: "35%"}}></div>
                        <div className="skel skel-status"></div>
                    </div>
                    <div className="card-right">
                        <div className="skel skel-meta"></div>
                        <div className="skel skel-arrow"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
