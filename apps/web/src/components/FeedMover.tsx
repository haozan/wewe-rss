import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@web/utils/trpc';

interface FeedMoverProps {
  isOpen: boolean;
  onClose: () => void;
  feedIds: string[];
  onSuccess?: () => void;
}

const FeedMover = ({ isOpen, onClose, feedIds, onSuccess }: FeedMoverProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const { data: foldersData } = trpc.folder.list.useQuery({});
  const { mutateAsync: moveFeedsToFolder, isLoading: isMoving } = 
    trpc.folder.moveFeedsToFolder.useMutation();

  const handleMove = async () => {
    try {
      await moveFeedsToFolder({
        feedIds,
        folderId: selectedFolderId === 'uncategorized' ? null : selectedFolderId || null,
      });
      
      toast.success(`已移动 ${feedIds.length} 个订阅源`);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('移动失败');
    }
  };

  const handleClose = () => {
    setSelectedFolderId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader>
              移动订阅源到文件夹
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  将 {feedIds.length} 个订阅源移动到：
                </div>
                
                <Select
                  label="选择目标文件夹"
                  placeholder="选择文件夹"
                  selectedKeys={selectedFolderId ? [selectedFolderId] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setSelectedFolderId(key);
                  }}
                >
                  <SelectItem key="uncategorized" value="uncategorized">
                    📂 未分类
                  </SelectItem>
                  {foldersData?.items?.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      📁 {folder.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="flat" onPress={handleClose}>
                取消
              </Button>
              <Button
                color="primary"
                onPress={handleMove}
                isLoading={isMoving}
                isDisabled={!selectedFolderId}
              >
                移动
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default FeedMover; 