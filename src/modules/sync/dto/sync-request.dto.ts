import { UserEntity } from '../../user/entity/user.entity';

export class SyncRequestDto {
  syncEvent: string;
  syncUser: UserEntity;
  status: boolean;
  startTime: Date;
  finishTime?: Date;
  failReason: string;
}
