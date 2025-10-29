import React, { useEffect, useState } from 'react';
import { Grid, Empty } from '@arco-design/web-react';
import TagItem from './tag/card-tag';
import { WebTag } from './interface';

const { GridItem } = Grid;

interface TagListProps {
    /*  list: Array<WebTag>;
     parentHide: boolean;
     showItem: boolean;
     pageNo?: number;
     loading?: boolean;
     selectGroup?: Array<number>;
     empty?: boolean;
     onEditTag: (tag: WebTag) => void;
     onDeleteSuccess: (id: string) => void; */

    parentHide: boolean,
    add: Boolean,
    list?: Array<WebTag>,
    selectGroup?: Array<number>,
    empty?: boolean,
    showItem: boolean,
    pageNo?: number,
    loading?: boolean,
    onEditTag?: (tag: WebTag) => void,
    onDeleteSuccess: (id: string) => void,
}

const TagList: React.FC<TagListProps> = (props) => {
    const {
        list,
        parentHide,
        showItem,
        pageNo,
        loading,
        selectGroup,
        empty,
        onEditTag,
        onDeleteSuccess,
    } = props;

    const [tagList, setTagList] = useState(list);

    useEffect(() => {
    }, [tagList]);

    function refreshTagList(id) {
        console.log('TagList refreshTagList', id);
        setTagList(list.filter(item => item.id !== id));
    }

    if (empty || !tagList || tagList.length === 0) {
        return <Empty />;
    }

    return (
        <div style={{ width: '100%' }}>
            <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }} colGap={12} rowGap={16}>
                {tagList.map((item, index) => (
                    ((!item.hide) || (item.hide && showItem)) &&
                    <GridItem key={item.id} className='demo-item'>
                        <TagItem
                            tag={item}
                            parentHide={parentHide}
                            no={pageNo}
                            editTag={onEditTag}
                            loading={loading}
                            selectGroup={selectGroup}
                            // onDeleteSuccess={onDeleteSuccess}
                            onDeleteSuccess={refreshTagList}
                        />
                    </GridItem>
                ))}
            </Grid>
        </div>
    );
};

export default TagList;