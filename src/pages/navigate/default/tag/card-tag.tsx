import { Card, Tooltip } from '@arco-design/web-react';
import './index.css'
import './bootstrap.min.css'

const api = import.meta.env.VITE_REACT_APP_BASE_API;
const App = (props) => {
    const { tag } = props

    function openUrl(url: string) {
        window.open(url, '_blank')
    }

    return (
        <div className="xe-widget xe-conversations box2 label-info"
            onClick={() => openUrl(tag.url)}
            data-toggle="tooltip" data-placement="bottom" title="">
            <div className="xe-comment-entry">
                <a className="xe-user-img">
                    <img src={`${api}${tag.icon}`}
                        // <img src={`${tag.icon}`}
                        className="lozad img-circle"
                        width="40"></img>
                </a>
                <span className="label label-info" data-toggle="tooltip"
                    data-placement="left"
                    title="" data-original-title="Hello I am a Tooltip"></span>
                <div className="xe-comment">
                    <a href="#" className="xe-user-name overflowClip_1">
                        <strong>{tag.name}</strong>
                    </a>
                    <Tooltip position='bottom' trigger='hover' content={tag.description}>
                        <p className="overflowClip_2">{tag.description}
                        </p>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export default App;
