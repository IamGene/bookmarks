import { Card, Avatar, Link, Typography, Space } from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { IconSearch } from '@arco-design/web-react/icon';

const Content = ({ children }) => {

    const searchState = useSelector((state: any) => state.global.search);
    const { keyword, searchType, searchResultNum } = searchState;
    // 搜索类型到名称的映射（单独提取，便于维护与国际化）
    const typeNames: Record<number, string> = {
        0: '默认',
        1: '标题',
        2: '描述',
        3: '域名',
        4: 'URL',
        5: '日期',
    };
    const displayType = typeNames[Number(searchType)] || '默认';
    return (
        <Space
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <Space>
                {/* <Avatar
                    style={{
                        backgroundColor: '#165DFF',
                    }}
                    size={28}
                >
                    S
                </Avatar> */}

                <Typography.Text><Link>{keyword}</Link></Typography.Text>
                <Typography.Text>按</Typography.Text>
                <Typography.Text style={{ fontWeight: 600 }}>{displayType}</Typography.Text>
                <IconSearch></IconSearch>
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
