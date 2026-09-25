import { IsNotEmpty, IsString } from "class-validator";

export class JoinOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  partnerId: string;
}
