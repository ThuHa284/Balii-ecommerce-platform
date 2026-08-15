import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

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
  @MinLength(10, {
    message: 'Mật khẩu phải có ít nhất 10 ký tự',
  })
  @MaxLength(128)
  newPassword!: string;
}
