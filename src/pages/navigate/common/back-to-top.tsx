import React, { useState, useEffect } from 'react';
import { Button } from '@arco-design/web-react';

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Button
            onClick={handleClick}
            type='primary'
            iconOnly
            style={{
                width: 40, height: 40,
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                overflow: 'hide',
                // right: '0',
                zIndex: 999,
                // 条件渲染，当 showButton 为 true 时显示按钮
                display: showButton ? 'block' : 'none'
            }}
        >
            TOP
        </Button>

    );
}

export default BackToTopButton;