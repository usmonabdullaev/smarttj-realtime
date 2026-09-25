import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  bearing?: number; // Направление движения (0-360 градусов)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speed?: number; // Скорость курьера

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  timestamp?: number;
}
