import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
} from '@nextui-org/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@web/utils/trpc';
import { PlusIcon } from './PlusIcon';

interface FolderManagerProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
}

const FolderManager = ({ onFolderSelect, selectedFolderId }: FolderManagerProps) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<any>(null);

  const { data: foldersData, refetch: refetchFolders } = trpc.folder.list.useQuery({});
  const { data: uncategorizedFeeds } = trpc.feed.list.useQuery({ folderId: 'uncategorized' });
  const { mutateAsync: addFolder, isLoading: isAddingFolder } = trpc.folder.add.useMutation();
  const { mutateAsync: editFolder, isLoading: isEditingFolder } = trpc.folder.edit.useMutation();
  const { mutateAsync: deleteFolder } = trpc.folder.delete.useMutation();

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    try {
      if (editingFolder) {
        await editFolder({
          id: editingFolder.id,
          data: { name: folderName.trim() },
        });
        toast.success('文件夹已更新');
      } else {
        await addFolder({
          name: folderName.trim(),
          order: 0,
        });
        toast.success('文件夹已创建');
      }
      
      setFolderName('');
      setEditingFolder(null);
      onClose();
      refetchFolders();
    } catch (error) {
      console.error('Error:', error);
      toast.error(editingFolder ? '更新文件夹失败' : '创建文件夹失败');
    }
  };

  const handleEditFolder = (folder: any) => {
    console.log('Editing folder:', folder);
    setEditingFolder(folder);
    setFolderName(folder.name);
    onOpen();
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('确定删除此文件夹吗？文件夹内的订阅源将移动到未分类。')) {
      return;
    }

    try {
      await deleteFolder(folderId);
      toast.success('文件夹已删除');
      refetchFolders();
      
      // 如果删除的是当前选中的文件夹，切换到全部
      if (selectedFolderId === folderId) {
        onFolderSelect?.(null);
      }
    } catch (error) {
      toast.error('删除文件夹失败');
    }
  };

  const openCreateModal = () => {
    setEditingFolder(null);
    setFolderName('');
    onOpen();
  };

  return (
    <>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-600">文件夹</h4>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={openCreateModal}
            className="h-6 w-6 min-w-6"
          >
            <PlusIcon className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="space-y-1">
          {/* 全部文件夹 */}
          <div
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              selectedFolderId === null ? 'bg-primary-50 text-primary' : 'hover:bg-gray-50'
            }`}
            onClick={() => onFolderSelect?.(null)}
          >
            <span className="text-sm">📁 全部</span>
          </div>

          {/* 未分类 */}
          <div
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              selectedFolderId === 'uncategorized' ? 'bg-primary-50 text-primary' : 'hover:bg-gray-50'
            }`}
            onClick={() => onFolderSelect?.('uncategorized')}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm">📂 未分类</span>
              <Chip size="sm" variant="flat" className="text-xs">
                {uncategorizedFeeds?.items?.length || 0}
              </Chip>
            </div>
          </div>

          {/* 自定义文件夹 */}
          {foldersData?.items?.map((folder) => (
            <div
              key={folder.id}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group ${
                selectedFolderId === folder.id ? 'bg-primary-50 text-primary' : 'hover:bg-gray-50'
              }`}
              onClick={() => onFolderSelect?.(folder.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm">📁 {folder.name}</span>
                <Chip size="sm" variant="flat" className="text-xs">
                  {folder._count?.feeds || 0}
                </Chip>
              </div>
              
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="h-6 w-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋯
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem
                    key="edit"
                    onPress={() => handleEditFolder(folder)}
                  >
                    编辑
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    color="danger"
                    onPress={() => handleDeleteFolder(folder.id)}
                  >
                    删除
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingFolder ? '编辑文件夹' : '创建文件夹'}
              </ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  label="文件夹名称"
                  placeholder="输入文件夹名称"
                  value={folderName}
                  onValueChange={setFolderName}
                  variant="bordered"
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateFolder}
                  isLoading={isAddingFolder || isEditingFolder}
                  isDisabled={!folderName.trim()}
                >
                  {editingFolder ? '更新' : '创建'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default FolderManager; 