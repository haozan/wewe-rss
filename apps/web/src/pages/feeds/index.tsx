import {
  Avatar,
  Button,
  Divider,
  Listbox,
  ListboxItem,
  ListboxSection,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Textarea,
  Tooltip,
  useDisclosure,
  Link,
  Checkbox,
} from '@nextui-org/react';
import { PlusIcon } from '@web/components/PlusIcon';
import { trpc } from '@web/utils/trpc';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { serverOriginUrl } from '@web/utils/env';
import ArticleList from './list';
import FolderManager from '@web/components/FolderManager';
import FeedMover from '@web/components/FeedMover';

const Feeds = () => {
  const { id } = useParams();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { isOpen: isMoverOpen, onOpen: onMoverOpen, onClose: onMoverClose } = useDisclosure();
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // 根据文件夹过滤条件构建查询参数
  const feedQueryParams = useMemo(() => {
    if (selectedFolderId === 'uncategorized') {
      return { folderId: 'uncategorized' };
    } else if (selectedFolderId) {
      return { folderId: selectedFolderId };
    }
    return {};
  }, [selectedFolderId]);

  const { refetch: refetchFeedList, data: feedData } = trpc.feed.list.useQuery(
    feedQueryParams,
    {
      refetchOnWindowFocus: true,
    },
  );

  const navigate = useNavigate();

  const queryUtils = trpc.useUtils();

  const { mutateAsync: getMpInfo, isLoading: isGetMpInfoLoading } =
    trpc.platform.getMpInfo.useMutation({});
  const { mutateAsync: updateMpInfo } = trpc.feed.edit.useMutation({});

  const { mutateAsync: addFeed, isLoading: isAddFeedLoading } =
    trpc.feed.add.useMutation({});
  const { mutateAsync: refreshMpArticles, isLoading: isGetArticlesLoading } =
    trpc.feed.refreshArticles.useMutation();
  const {
    mutateAsync: getHistoryArticles,
    isLoading: isGetHistoryArticlesLoading,
  } = trpc.feed.getHistoryArticles.useMutation();

  const { data: inProgressHistoryMp, refetch: refetchInProgressHistoryMp } =
    trpc.feed.getInProgressHistoryMp.useQuery(undefined, {
      refetchOnWindowFocus: true,
      refetchInterval: 10 * 1e3,
      refetchOnMount: true,
      refetchOnReconnect: true,
    });

  const { data: isRefreshAllMpArticlesRunning } =
    trpc.feed.isRefreshAllMpArticlesRunning.useQuery();

  const { mutateAsync: deleteFeed, isLoading: isDeleteFeedLoading } =
    trpc.feed.delete.useMutation({});

  const [wxsLink, setWxsLink] = useState('');

  const [currentMpId, setCurrentMpId] = useState(id || '');

  // 处理文件夹选择
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setCurrentMpId(''); // 清空当前选中的订阅源
    setIsSelectionMode(false); // 退出选择模式
    setSelectedFeedIds([]); // 清空选择
  };

  // 处理选择模式切换
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedFeedIds([]);
  };

  // 处理单个订阅源选择
  const handleFeedSelection = (feedId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFeedIds(prev => [...prev, feedId]);
    } else {
      setSelectedFeedIds(prev => prev.filter(id => id !== feedId));
    }
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedFeedIds.length === (feedData?.items.length || 0)) {
      setSelectedFeedIds([]);
    } else {
      setSelectedFeedIds(feedData?.items.map(item => item.id) || []);
    }
  };

  // 批量移动完成后的回调
  const handleMoveSuccess = () => {
    setSelectedFeedIds([]);
    setIsSelectionMode(false);
    refetchFeedList();
  };

  const handleConfirm = async () => {
    console.log('wxsLink', wxsLink);
    // TODO show operation in progress
    const wxsLinks = wxsLink.split('\n').filter((link) => link.trim() !== '');
    for (const link of wxsLinks) {
      console.log('add wxsLink', link);
      const res = await getMpInfo({ wxsLink: link });
      if (res[0]) {
        const item = res[0];
        await addFeed({
          id: item.id,
          mpName: item.name,
          mpCover: item.cover,
          mpIntro: item.intro,
          updateTime: item.updateTime,
          status: 1,
          // 如果当前选中了文件夹，添加订阅源时自动分配到该文件夹
          folderId: selectedFolderId && selectedFolderId !== 'uncategorized' ? selectedFolderId : undefined,
        });
        await refreshMpArticles({ mpId: item.id });
        toast.success('添加成功', {
          description: `公众号 ${item.name}`,
        });
        await queryUtils.article.list.reset();
      } else {
        toast.error('添加失败', { description: '请检查链接是否正确' });
      }
    }
    refetchFeedList();
    setWxsLink('');
    onClose();
  };

  const isActive = (key: string) => {
    return currentMpId === key;
  };

  const currentMpInfo = useMemo(() => {
    return feedData?.items.find((item) => item.id === currentMpId);
  }, [currentMpId, feedData?.items]);

  const handleExportOpml = async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!feedData?.items?.length) {
      console.warn('没有订阅源');
      return;
    }

    let opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
      <head>
        <title>WeWeRSS 所有订阅源</title>
      </head>
      <body>
    `;

    feedData?.items.forEach((sub) => {
      opmlContent += `    <outline text="${sub.mpName}" type="rss" xmlUrl="${window.location.origin}/feeds/${sub.id}.atom" htmlUrl="${window.location.origin}/feeds/${sub.id}.atom"/>\n`;
    });

    opmlContent += `    </body>
    </opml>`;

    const blob = new Blob([opmlContent], { type: 'text/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'WeWeRSS-All.opml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="h-full flex justify-between">
        <div className="w-64 p-4 h-full flex flex-col">
          {/* 文件夹管理器 */}
          <FolderManager 
            selectedFolderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
          />
          
          <div className="pb-4 flex justify-between align-middle items-center">
            <Button
              color="primary"
              size="sm"
              onPress={onOpen}
              endContent={<PlusIcon />}
            >
              添加
            </Button>
            <div className="font-normal text-sm">
              共{feedData?.items.length || 0}个订阅
            </div>
          </div>

          {/* 批量操作工具栏 */}
          {feedData?.items && feedData.items.length > 0 && (
            <div className="pb-2 flex justify-between items-center">
              <Button 
                size="sm" 
                variant="light"
                onPress={handleToggleSelectionMode}
              >
                {isSelectionMode ? '取消选择' : '批量选择'}
              </Button>
              
              {isSelectionMode && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="light"
                    onPress={handleSelectAll}
                  >
                    {selectedFeedIds.length === feedData.items.length ? '取消全选' : '全选'}
                  </Button>
                  {selectedFeedIds.length > 0 && (
                    <Button 
                      size="sm" 
                      color="primary"
                      onPress={onMoverOpen}
                    >
                      移动({selectedFeedIds.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {feedData?.items ? (
            <div className="flex-1 overflow-y-auto">
            <Listbox
              aria-label="订阅源"
              emptyContent="暂无订阅"
              onAction={(key) => !isSelectionMode && setCurrentMpId(key as string)}
              selectionMode="none"
            >
              {!selectedFolderId ? (
                <ListboxSection showDivider>
                  <ListboxItem
                    key={''}
                    href={`/dash/feeds`}
                    className={isActive('') ? 'bg-primary-50 text-primary' : ''}
                    startContent={<Avatar name="ALL"></Avatar>}
                  >
                    全部
                  </ListboxItem>
                </ListboxSection>
              ) : null}

              <ListboxSection>
                {feedData?.items?.map((item) => {
                  const isSelected = selectedFeedIds.includes(item.id);
                  return (
                    <ListboxItem
                      key={item.id}
                      href={undefined}
                      className={
                        isActive(item.id) ? 'bg-primary-50 text-primary' : ''
                      }
                      startContent={
                        isSelectionMode ? (
                          <Checkbox
                            isSelected={isSelected}
                            onValueChange={(checked) => handleFeedSelection(item.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <Avatar src={item.mpCover}></Avatar>
                        )
                      }
                      onClick={isSelectionMode ? (e) => {
                        e.preventDefault();
                        handleFeedSelection(item.id, !isSelected);
                      } : (e) => {
                        e.preventDefault();
                        setCurrentMpId(item.id);
                        navigate(`/feeds/${item.id}`);
                      }}
                    >
                      {item.mpName}
                    </ListboxItem>
                  );
                })}
              </ListboxSection>
            </Listbox>
            </div>
          ) : (
            ''
          )}
        </div>
        
        {/* 主内容区域保持不变 */}
        <div className="flex-1 h-full flex flex-col">
          <div className="p-4 pb-0 flex justify-between">
            <h3 className="text-medium font-mono flex-1 overflow-hidden text-ellipsis break-keep text-nowrap pr-1">
              {currentMpInfo?.mpName || (selectedFolderId === 'uncategorized' ? '未分类' : selectedFolderId ? '文件夹内容' : '全部')}
            </h3>
            {currentMpInfo ? (
              <div className="flex h-5 items-center space-x-4 text-small">
                <div className="font-light">
                  最后更新时间:
                  {dayjs(currentMpInfo.syncTime * 1e3).format(
                    'YYYY-MM-DD HH:mm:ss',
                  )}
                </div>
                <Divider orientation="vertical" />
                <Tooltip
                  content="频繁调用可能会导致一段时间内不可用"
                  color="danger"
                >
                  <Link
                    size="sm"
                    href="#"
                    isDisabled={isGetArticlesLoading}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      await refreshMpArticles({ mpId: currentMpInfo.id });
                      await refetchFeedList();
                      await queryUtils.article.list.reset();
                    }}
                  >
                    {isGetArticlesLoading ? '更新中...' : '立即更新'}
                  </Link>
                </Tooltip>
                <Divider orientation="vertical" />
                {currentMpInfo.hasHistory === 1 && (
                  <>
                    <Tooltip
                      content={
                        inProgressHistoryMp?.id === currentMpInfo.id
                          ? `正在获取第${inProgressHistoryMp?.page || 1}页...`
                          : `历史文章需要分批次拉取，请耐心等候，频繁调用可能会导致一段时间内不可用`
                      }
                      color={
                        inProgressHistoryMp?.id === currentMpInfo.id
                          ? 'primary'
                          : 'danger'
                      }
                    >
                      <Link
                        size="sm"
                        href="#"
                        isDisabled={
                          (inProgressHistoryMp?.id
                            ? inProgressHistoryMp?.id !== currentMpInfo.id
                            : false) ||
                          isGetHistoryArticlesLoading ||
                          isGetArticlesLoading
                        }
                        onClick={async (ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();

                          if (inProgressHistoryMp?.id === currentMpInfo.id) {
                            await getHistoryArticles({
                              mpId: '',
                            });
                          } else {
                            await getHistoryArticles({
                              mpId: currentMpInfo.id,
                            });
                          }

                          await refetchInProgressHistoryMp();
                        }}
                      >
                        {inProgressHistoryMp?.id === currentMpInfo.id
                          ? `停止获取历史文章`
                          : `获取历史文章`}
                      </Link>
                    </Tooltip>
                    <Divider orientation="vertical" />
                  </>
                )}

                <Tooltip content="启用服务端定时更新">
                  <div>
                    <Switch
                      size="sm"
                      onValueChange={async (value) => {
                        await updateMpInfo({
                          id: currentMpInfo.id,
                          data: {
                            status: value ? 1 : 0,
                          },
                        });

                        await refetchFeedList();
                      }}
                      isSelected={currentMpInfo?.status === 1}
                    ></Switch>
                  </div>
                </Tooltip>
                <Divider orientation="vertical" />
                <Tooltip content="仅删除订阅源，已获取的文章不会被删除">
                  <Link
                    href="#"
                    color="danger"
                    size="sm"
                    isDisabled={isDeleteFeedLoading}
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();

                      if (window.confirm('确定删除吗？')) {
                        await deleteFeed(currentMpId);
                        navigate('/feeds');
                        await refetchFeedList();
                      }
                    }}
                  >
                    删除
                  </Link>
                </Tooltip>

                <Divider orientation="vertical" />
                <Tooltip
                  content={
                    <div>
                      可添加.atom/.rss/.json格式输出, limit=20&page=1控制分页
                    </div>
                  }
                >
                  <Link
                    size="sm"
                    showAnchorIcon
                    target="_blank"
                    href={`${serverOriginUrl}/feeds/${currentMpInfo.id}.atom`}
                    color="foreground"
                  >
                    RSS
                  </Link>
                </Tooltip>
              </div>
            ) : (
              <div className="flex gap-2">
                <Tooltip
                  content="频繁调用可能会导致一段时间内不可用"
                  color="danger"
                >
                  <Link
                    size="sm"
                    href="#"
                    isDisabled={
                      isRefreshAllMpArticlesRunning || isGetArticlesLoading
                    }
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      await refreshMpArticles({});
                      await refetchFeedList();
                      await queryUtils.article.list.reset();
                    }}
                  >
                    {isRefreshAllMpArticlesRunning || isGetArticlesLoading
                      ? '更新中...'
                      : '更新全部'}
                  </Link>
                </Tooltip>
                <Link
                  href="#"
                  color="foreground"
                  onClick={handleExportOpml}
                  size="sm"
                >
                  导出OPML
                </Link>
                <Divider orientation="vertical" />
                <Link
                  size="sm"
                  showAnchorIcon
                  target="_blank"
                  href={`${serverOriginUrl}/feeds/all.atom`}
                  color="foreground"
                >
                  RSS
                </Link>
              </div>
            )}
          </div>
          <div className="p-2 overflow-y-auto">
            <ArticleList></ArticleList>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                添加公众号源
              </ModalHeader>
              <ModalBody>
                <Textarea
                  value={wxsLink}
                  onValueChange={setWxsLink}
                  autoFocus
                  label="分享链接"
                  placeholder="输入公众号文章分享链接，一行一条，如 https://mp.weixin.qq.com/s/xxxxxx https://mp.weixin.qq.com/s/xxxxxx"
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  isDisabled={
                    !wxsLink.startsWith('https://mp.weixin.qq.com/s/')
                  }
                  onPress={handleConfirm}
                  isLoading={
                    isAddFeedLoading ||
                    isGetMpInfoLoading ||
                    isGetArticlesLoading
                  }
                >
                  确定
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 批量移动订阅源弹窗 */}
      <FeedMover
        isOpen={isMoverOpen}
        onClose={onMoverClose}
        feedIds={selectedFeedIds}
        onSuccess={handleMoveSuccess}
      />
    </>
  );
};

export default Feeds;
