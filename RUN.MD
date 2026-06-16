uvicorn app:app --host 0.0.0.0 --port 8010 --reload
.\.venv\Scripts\activate
>> uvicorn app:app --host 0.0.0.0 --port 8010 --reload                                                                
                  
### Terminal 1 - API Gateway

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:gateway
```

Port: `4000`

### Terminal 2 - User Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:user
```

Port: `3001`

### Terminal 3 - Product Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:product
```

Port: `3002`

### Terminal 4 - Cart Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:cart
```

Port theo `.env`: `3003`

### Terminal 5 - Order Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:order
```

Port: `3004`

### Terminal 6 - Payment Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:payment
```

Port: `3005`

### Terminal 7 - Virtual Try-on Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:tryon
```

Port: `3010`

## 4. Chay frontend

Mo them 1 terminal rieng:

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform\frontend
npm run dev
```

Frontend mac dinh: `http://localhost:3000`

