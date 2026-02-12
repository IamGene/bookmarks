import { Card, Avatar, Link, Typography, Space } from '@arco-design/web-react';
import { useSelector } from 'react-redux'


const Content = ({ children }) => {

    const searchState = useSelector((state: any) => state.global.search);
    const { keyword, searchResultNum } = searchState;

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
                    S
                </Avatar>
                <Typography.Text><Link>{keyword}</Link></Typography.Text>
                <Typography.Text>搜索结果：</Typography.Text>
                <Typography.Text><Link><span style={{ color: 'red' }}>{searchResultNum}</span></Link></Typography.Text>
            </Space>
            {children}
        </Space>
    );
};

const App = () => {
    return (
        <>
            <Card
                hoverable
                // style={{ width: 360, marginBottom: 20 }}
                style={{ marginBottom: 20 }}
            >
                <Content></Content>
            </Card>
        </>
    );
};

export default App;
