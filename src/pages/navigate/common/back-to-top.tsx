import React, { useState, useEffect } from 'react';
import { BackTop, Button, Select, Input, Typography, Space } from '@arco-design/web-react';
import { IconCaretUp } from '@arco-design/web-react/icon';
const { Paragraph, Text } = Typography;
const easingTypes = [
    'linear',
    'quadIn',
    'quadOut',
    'quadInOut',
    'cubicIn',
    'cubicOut',
    'cubicInOut',
    'quartIn',
    'quartOut',
    'quartInOut',
    'quintIn',
    'quintOut',
    'quintInOut',
    'sineIn',
    'sineOut',
    'sineInOut',
    'bounceIn',
    'bounceOut',
    'bounceInOut',
];
function BackToTopButton() {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // setShowButton(window.scrollY > 100);
            setShowButton(window.scrollY > 200);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleClick = () => {
        // behavior: 'smooth'
        window.scrollTo({ top: 0, behavior: 'smooth' });
        /*  // 使用可控动画实现更快的回到顶部
         const start = window.scrollY || window.pageYOffset;
         const dur = Math.max(50, Number(duration) || 200); // 最小 50ms，默认 200ms
         const easeName = easing || 'linear';
 
         const easings: { [key: string]: (t: number) => number } = {
             linear: t => t,
             quadOut: t => t * (2 - t),
             quadIn: t => t * t,
             cubicOut: t => (--t) * t * t + 1,
             cubicInOut: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
             sineOut: t => Math.sin((t * Math.PI) / 2),
         };
 
         const easeFn = easings[easeName] || easings.linear;
         let startTime: number | null = null;
 
         function step(timestamp: number) {
             if (startTime === null) startTime = timestamp;
             const elapsed = timestamp - startTime;
             const progress = Math.min(1, elapsed / dur);
             const eased = easeFn(progress);
             const y = Math.round(start * (1 - eased));
             window.scrollTo(0, y);
             if (progress < 1) {
                 window.requestAnimationFrame(step);
             }
         }
 
         window.requestAnimationFrame(step); */
    };

    const [duration, setDuration] = useState(0);
    const [easing, setEasing] = useState('linear');
    return (


        < Button
            onClick={handleClick}
            // type='primary'
            iconOnly
            // shape='round'
            style={{
                width: 40, height: 40,
                position: 'fixed',
                bottom: '10px',
                backgroundColor: '#6aa1ff',
                // backgroundColor: '#94bfff',
                right: '10px',
                overflow: 'hide',
                // right: '0',
                zIndex: 999,
                // 条件渲染，当 showButton 为 true 时显示按钮
                display: showButton ? 'block' : 'none'
            }
            }
        >
            ▲
            {/* <IconCaretUp /> */}
        </Button >
    );

}

export default BackToTopButton;