import { Card, Avatar, Link, Typography, Space } from '@arco-design/web-react';
import { IconArrowRight } from '@arco-design/web-react/icon';
import './style/card.menu.less';

const Content = ({ children }) => {
    return (
        <Space
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <Space>
                <Avatar
                    style={{
                        backgroundColor: '#165DFF',
                    }}
                    size={28}
                >
                    A
                </Avatar>
                <Typography.Text>Username</Typography.Text>
            </Space>
            {children}
        </Space>
    );
};

const App = () => {
    return (
        <Card
            className='card-with-icon-hover'
            hoverable
        // style={{ width: 360 }}
        >
            <Content>
                <span className='icon-hover'>
                    <IconArrowRight
                        style={{
                            cursor: 'pointer',
                        }}
                    />
                </span>
            </Content>
        </Card>
    );
};

export default App;
