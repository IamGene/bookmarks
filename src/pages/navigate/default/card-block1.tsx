import React, { useEffect, useState } from 'react';
import cs from 'classnames';
import {
  Button,
  Switch,
  Tag,
  Card,
  Descriptions,
  Typography,
  Dropdown,
  Menu,
  Skeleton,
} from '@arco-design/web-react';
import {
  IconStarFill,
  IconThumbUpFill,
  IconSunFill,
  IconFaceSmileFill,
  IconPenFill,
  IconCheckCircleFill,
  IconCloseCircleFill,
  IconMore,
} from '@arco-design/web-react/icon';
import PermissionWrapper from '@/components/PermissionWrapper';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import { QualityInspection, BasicCard, TagCard } from './interface';
import styles from './style/index.module.less';

interface CardBlockType {
  // card: QualityInspection & BasicCard;
  card: TagCard;
  loading?: boolean;
}

const IconList = [
  IconStarFill,
  IconThumbUpFill,
  IconSunFill,
  IconFaceSmileFill,
  IconPenFill,
].map((Tag, index) => <Tag key={index} />);

const { Paragraph } = Typography;


const api = import.meta.env.VITE_REACT_APP_BASE_API;
const protocol = import.meta.env.VITE_REACT_APP_BASE_PROTOCOL;


function CardBlock(props: CardBlockType) {
  const { card = {} } = props;

  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState(card.status);
  const [loading, setLoading] = useState(props.loading);

  const t = useLocale(locale);
  const changeStatus = async () => {
    setLoading(true);
    await new Promise((resolve) =>
      setTimeout(() => {
        setStatus(status !== 1 ? 1 : 0);
        resolve(null);
      }, 1000)
    ).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(props.loading);
  }, [props.loading]);

  /*   useEffect(() => {
      if (card.status !== status) {
        setStatus(card.status);
      }
    }, [card.status]); */

  const getTitleIcon = () => {
    return (
      <div >
        <img
          style={{ height: '30px', width: 'auto' }}
          alt='icon'
          src={`http://localhost:8080${card.icon}`}
        />
      </div>
    );
  };

  const getMockTitleIcon = () => {
    return (
      <div className={styles.icon}>
        {IconList[card.icon % IconList.length]}
      </div>
    );
  };

  const getStatus = () => {
    switch (status) {
      case 1:
        return (
          <Tag
            color="green"
            icon={<IconCheckCircleFill />}
            className={styles.status}
            size="small"
          >
            {t['cardList.tag.opened']}
          </Tag>
        );
      case 2:
        return (
          <Tag
            color="red"
            icon={<IconCloseCircleFill />}
            className={styles.status}
            size="small"
          >
            {t['cardList.tag.expired']}
          </Tag>
        );
      default:
        return null;
    }
  };

  const getContent = () => {
    if (loading) {
      return (
        <Skeleton
          text={{ rows: 2 }}
          animation
          className={styles['card-block-skeleton']}
        />
      );
    }
    return <Paragraph>{card.intro}</Paragraph>;
  };

  const className = cs(styles['card-block']);

  return (
    <Card
      bordered={true}
      className={className}
      size="small"
      title={
        loading ? (
          <Skeleton
            animation
            text={{ rows: 1, width: ['100%'] }}
            style={{ width: '120px', height: '24px' }}
            className={styles['card-block-skeleton']}
          />
        ) : (
          <>
            <div
              className={cs(styles.title, {
                [styles['title-more']]: visible,
              })}
            >

              {/* {getTitleIcon()} */}
              {getMockTitleIcon()}

              {card.name}
              {getStatus()}

              <Switch checked={!!status} style={{ position: 'absolute', right: '40px' }} loading={loading} onChange={changeStatus} />
              <Dropdown
                droplist={
                  <Menu>
                    {['操作1', '操作2'].map((item, key) => (
                      <Menu.Item key={key.toString()}>{item}</Menu.Item>
                    ))}
                  </Menu>
                }
                trigger="click"
                onVisibleChange={setVisible}
                popupVisible={visible}
              >
                <div className={styles.more}>
                  <IconMore />
                </div>
              </Dropdown>
            </div>
          </>
        )
      }
    >
      <div className={styles.content}>{getContent()}</div>
      {/* <div className={styles.extra}>{getButtonGroup()}</div> */}
    </Card>
  );
}

export default CardBlock;
