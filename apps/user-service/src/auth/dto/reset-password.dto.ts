import {
 IsNotEmpty, 
 IsString, 
 MinLength 
} from 'class-validator';

export class ResetPasswordDto {
  @IsString({
    message: 'Token phải là chuỗi',
  })
  @IsNotEmpty({
    message: 'Token không được để trống',
  })
  token!: string;

  @IsString({
    message: 'Mật khẩu phải là chuỗi',
  })
  @IsNotEmpty({
    message: 'Mật khẩu không được để trống',
  })
  @MinLength(8, {
    message: 'Mật khẩu phải có ít nhất 8 ký tự',
  })
  newPassword!: string;
}