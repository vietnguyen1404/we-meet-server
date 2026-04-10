export class IceServerDto {
  urls!: string | string[];
  username?: string;
  credential?: string;
}

export class IceServersResponseDto {
  iceServers!: IceServerDto[];
}
