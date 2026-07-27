# Ke Hoach Tich Hop Gonow Cho Daigo Booking

## 1. Gonow la gi?

Gonow la tinh nang cho phep customer ket noi truc tiep voi tai xe dang o gan minh ngoai doi bang ma PIN hoac ma ket noi ngan han. Day la luong phu cho truong hop customer da gap tai xe Daigo tai san bay, ben xe, khach san, su kien, cong benh vien, quan cafe hoac diem don thuc te.

Khac voi luong dat xe thong thuong, Gonow khong can he thong tu dong phan bo tai xe. Customer va driver da co su tiep xuc thuc te truoc, sau do app chi lam nhiem vu:

- Xac nhan dung tai xe.
- Tao booking chinh thuc trong he thong.
- Dong bo gia, thanh toan, thong bao, lich su, ho tro va danh gia.
- Tranh tinh trang di ngoai app khong co du lieu quan ly.

Ten tinh nang trong Daigo nen dung la `Gonow`, khong dung ten GrabNow de tranh nham lan thuong hieu.

## 2. Gonow mang lai gia tri nghiep vu gi?

### Cho customer

- Khach da thay tai xe gan minh co the ket noi nhanh hon.
- Giam cam giac cho doi he thong tim tai xe.
- Van co booking chinh thuc, gia ro rang, thanh toan ro rang.
- Van co lich su chuyen, ho tro, danh gia, tin nhan/call.

### Cho driver

- Tai xe co the chuyen khach gap ngoai doi vao he thong Daigo.
- Giam tinh trang thoa thuan ngoai app.
- Van duoc tinh doanh thu, lich su, rating.
- Van co luong trang thai chuyen di chuan: nhan chuyen, da den diem don, bat dau, hoan thanh.

### Cho he thong Daigo

- Tang ty le booking thuc te tai cac diem tap trung nhu san bay, ben xe, khach san.
- Giu du lieu chuyen trong he thong.
- Giam rui ro tranh chap vi co booking, gia, tai xe, customer ro rang.
- Tao them mot kenh nhan chuyen cho driver ma khong pha vo luong booking hien tai.

## 3. Gonow co dung cho dat truoc khong?

Khuyen nghi: **khong dung Gonow cho dat truoc trong MVP**.

Ly do:

- Gonow ban chat la ket noi tai xe dang o gan customer tai thoi diem hien tai.
- Dat truoc la nghiep vu giu lich trong tuong lai, can check lich ranh, thoi gian nghi, reminder, slot bi trung.
- Neu cho Gonow dat truoc, can them logic giu lich tai xe bang ma PIN, het han, huy slot, doi gio, chong tai xe nhan trung lich. Do la mot nghiep vu rieng.

Ket luan thuc te:

- `Di ngay`: nen ho tro Gonow.
- `Dat truoc`: khong nen ho tro Gonow giai doan dau.
- Tuong lai co the lam bien the rieng: `Dat truoc voi tai xe quen` hoac `Dat truoc bang ma tai xe`, nhung khong nen tron voi Gonow.

## 4. Vi tri hien thi Gonow o customer

Theo huong UX hop ly, Gonow khong nen la tab rieng va cung khong nen nam qua noi bat o dau form.

Gonow nen xuat hien tai **buoc cuoi sau khi customer da chon xong diem don, diem den va he thong da tinh duoc xe/gia**.

### Vi tri UI de xuat

Tai man booking customer, sau khi da co:

- Diem don.
- Diem den.
- Thoi gian di: di ngay.
- So nguoi.
- Loai xe/xe phu hop.
- Gia uoc tinh.

Hien thi 2 hanh dong song song:

- `Dat xe ngay`
- `Gonow - Ket noi tai xe gan ban`

Hoac trong bottom sheet ket qua xe phu hop:

- Moi card xe co nut chinh: `Dat xe`
- Ben duoi co nut phu: `Nhap ma Gonow`

### Khong nen hien Gonow khi nao?

- Chua co diem don/diem den.
- Customer dang chon `Dat truoc`.
- Customer chua dang nhap neu he thong yeu cau dang nhap de dat xe.
- Customer chua xac minh thong tin bat buoc.
- Khong lay duoc vi tri va customer chua nhap vi tri fallback.

## 5. Luong customer Gonow de xuat

### Buoc 1: Customer nhap thong tin chuyen

Customer vao tab `Dat xe` va nhap:

- Diem don.
- Diem den.
- So nguoi.
- Ghi chu neu co.
- Chon mode `Di ngay`.

He thong tinh gia nhu luong booking hien tai.

### Buoc 2: Customer bam Gonow

Customer bam `Gonow - Ket noi tai xe gan ban`.

Mo bottom sheet hoac man rieng:

- Tieu de: `Nhap ma Gonow tu tai xe`
- Mo ta ngan: `Hay nhap ma 6 so hien tren app cua tai xe Daigo dang o gan ban.`
- Input OTP/PIN 6 o rieng le.
- Nut `Kiem tra tai xe`.

### Buoc 3: He thong verify PIN

Khi customer nhap PIN:

- Goi RPC `verify_gonow_pin`.
- Kiem tra PIN con han.
- Kiem tra session chua duoc dung.
- Kiem tra driver online/du dieu kien.
- Kiem tra driver khong co chuyen active.
- Kiem tra driver co xe hop le neu can.

### Buoc 4: Preview tai xe

Neu PIN hop le, hien preview:

- Anh tai xe.
- Ten tai xe.
- Rating.
- Xe.
- Bien so.
- So cho.
- Diem don.
- Diem den.
- Gia uoc tinh.
- Phuong thuc thanh toan.

Customer bam `Xac nhan ket noi`.

### Buoc 5: Tao booking Gonow

He thong tao booking voi:

- `booking_source = 'gonow'`
- `booking_mode = 'instant'`
- `driver_id = driver cua session Gonow`
- `status = DRIVER_ACCEPTED` hoac `GONOW_PENDING_DRIVER_CONFIRMATION`
- `gonow_session_id = session da verify`

Khuyen nghi MVP:

- Neu customer xac nhan va driver da tao ma Gonow, co the tao thang booking `DRIVER_ACCEPTED`.
- Neu muon chat hon, tao trang thai trung gian `GONOW_PENDING_DRIVER_CONFIRMATION`, driver bam chap nhan lan cuoi.

De giam thao tac, MVP nen dung cach 1: driver chu dong tao PIN nghia la driver da san sang nhan. Customer xac nhan xong thi booking duoc gan driver.

## 6. Luong driver Gonow de xuat

### Vi tri UI driver

Trong dashboard map full man cua driver, them mot action gon:

- `Gonow`

Nen dat trong bottom sheet dashboard, khong dat thanh card lon.

### Buoc 1: Driver bat Gonow

Driver bam `Gonow`.

He thong kiem tra:

- Driver dang dang nhap.
- Driver la role driver.
- Driver khong co chuyen active.
- Driver co xe dang hoat dong.
- Driver khong bi khoa/kyc rejected.
- Driver khong dang trong trang thai khong duoc nhan chuyen.

Neu hop le, tao session Gonow:

- PIN 6 so.
- Het han sau 2 phut.
- Chi dung duoc 1 lan.
- Luu hash PIN, khong luu plain PIN neu lam chat bao mat.

Driver thay man:

- Ma Gonow: `123456`
- Dong dem nguoc: `Con 01:58`
- Nut `Tao ma moi`
- Nut `Huy Gonow`

### Buoc 2: Customer nhap PIN

Khi customer nhap dung PIN va xac nhan booking:

Driver nhan realtime/push/in-app notification:

- `Khach da ket noi Gonow`
- Hien diem don, diem den, gia uoc tinh.
- Nut `Xem chuyen`.

Neu MVP da tao thang booking `DRIVER_ACCEPTED`, driver chi can tiep tuc thao tac chuyen.

Neu dung trang thai `GONOW_PENDING_DRIVER_CONFIRMATION`, driver can bam `Chap nhan` hoac `Tu choi`.

### Buoc 3: Tai xe thuc hien chuyen

Sau khi booking duoc tao, luong status dung lai luong hien tai:

- `DRIVER_ACCEPTED`
- `DRIVER_ARRIVING`
- `DRIVER_ARRIVED`
- `TRIP_STARTED`
- `TRIP_COMPLETED`

Trong thuc te, voi Gonow, tai xe co the dang o ngay diem don. Vi vay app co the bo qua `DRIVER_ARRIVING` hoac van giu de dong bo timeline.

Khuyen nghi:

- Van giu `DRIVER_ACCEPTED`.
- Tai xe bam `Da den diem don` neu dang dung ngay do.
- Sau khi khach len xe, bam `Bat dau chuyen`.

## 7. Thay doi database de xuat

### Bang moi: `gonow_sessions`

```sql
create table public.gonow_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid null,
  pin_hash text not null,
  pin_last4 text null,
  status text not null default 'active',
  expires_at timestamptz not null,
  matched_customer_id uuid null references public.profiles(id),
  matched_booking_id uuid null references public.bookings(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gonow_sessions_status_check check (
    status in ('active', 'matched', 'expired', 'cancelled')
  )
);
```

### Field them vao `bookings`

```sql
alter table public.bookings
add column if not exists booking_source text default 'normal',
add column if not exists gonow_session_id uuid null references public.gonow_sessions(id);
```

Gia tri `booking_source`:

- `normal`: dat xe thong thuong.
- `scheduled`: dat truoc.
- `gonow`: ket noi tai xe gan ban bang ma Gonow.

## 8. RPC/Edge Function can co

### `create_gonow_session()`

Dung cho driver tao ma.

Kiem tra server-side:

- Caller la driver.
- Driver khong co active booking.
- Driver du dieu kien nhan chuyen.
- Huy session active cu neu co.
- Tao PIN moi va luu hash.

Tra ve:

- `session_id`
- `pin`
- `expires_at`

Luu y: PIN plain chi tra ve mot lan cho driver, khong nen luu plain trong DB.

### `verify_gonow_pin(pin)`

Dung cho customer kiem tra PIN.

Tra ve preview driver:

- Driver id.
- Ten tai xe.
- Avatar.
- Rating.
- Vehicle.
- Bien so.
- Session id.
- Expires at.

Khong tao booking o buoc nay de tranh customer nhap PIN roi bo do.

### `create_gonow_booking(session_id, booking_payload)`

Dung cho customer tao booking sau khi confirm.

Kiem tra server-side:

- Session active.
- Session chua het han.
- Session chua matched.
- Customer chinh la caller.
- Driver khong co active booking tai thoi diem tao.
- Gia duoc tinh/validate server-side neu co RPC tinh gia.

Sau do:

- Tao booking.
- Gan driver.
- Doi session status = `matched`.
- Tao notification cho driver va customer.

## 9. RLS va bao mat

### Nguyen tac

- Mobile app khong duoc dung service_role.
- Customer khong duoc tu gan driver_id tuy y ngoai RPC.
- Driver khong duoc xem session Gonow cua driver khac.
- PIN nen luu hash, khong luu plain text.
- PIN het han ngan: 2 phut.
- Gioi han sai PIN: vi du 5 lan/phut/thiet bi/user.

### RLS de xuat

`gonow_sessions`:

- Driver chi select session cua minh.
- Customer khong select truc tiep bang table.
- Customer chi verify qua RPC.
- Insert/update session chi qua RPC.

`bookings`:

- Booking Gonow chi tao qua RPC.
- Customer xem booking cua minh.
- Driver xem booking gan voi minh.

## 10. Thong bao realtime/push

Can tao notification khi:

- Customer tao booking Gonow thanh cong.
- Driver huy session Gonow.
- Gonow session het han neu dang hien tren UI.
- Driver/customer huy booking Gonow.

Payload notification nen ro rang:

```json
{
  "type": "gonow_booking_created",
  "target_route": "/(driver)/booking-detail",
  "booking_id": "...",
  "gonow_session_id": "..."
}
```

Push click phai dung notification router resolver hien co de mo dung booking detail.

## 11. UI/UX customer chi tiet

### Tren booking result bottom sheet

Sau khi co ket qua xe/gia:

- Nut chinh: `Dat xe ngay`
- Nut phu: `Gonow`

Text phu:

`Dang o gan tai xe Daigo? Nhap ma Gonow de ket noi dung tai xe do.`

### Bottom sheet nhap PIN

Thanh phan:

- Icon ket noi/tai xe.
- Tieu de ngan.
- 6 o nhap PIN rieng le.
- Nut `Kiem tra tai xe`.
- Loading state.
- Error state:
  - `Ma khong dung.`
  - `Ma da het han.`
  - `Tai xe dang ban chuyen.`
  - `Tai xe khong con san sang nhan chuyen.`

### Preview truoc xac nhan

Hien card sat border, han che bo goc qua nhieu theo UI Daigo hien tai:

- Tai xe.
- Xe.
- Bien so.
- Gia.
- Diem don/diem den.
- Phuong thuc thanh toan.

CTA:

- `Xac nhan ket noi Gonow`
- `Nhap ma khac`

## 12. UI/UX driver chi tiet

### Dashboard bottom sheet

Them quick action:

- `Gonow`

Khi bam:

- Mo bottom sheet tao ma.
- Hien PIN to, de doc.
- Hien dem nguoc.
- Hien trang thai:
  - `Dang cho khach nhap ma`
  - `Khach da ket noi`
  - `Ma da het han`

### Khi booking Gonow duoc tao

Hien toast/action:

- `Khach da ket noi Gonow`
- Nut `Xem chi tiet`

Co the kem am bao nhe neu app foreground, tuong tu booking moi.

## 13. Dong bo voi luong hien tai cua Daigo

Gonow nen tai su dung cac module hien co:

- Booking form customer.
- Price breakdown.
- Booking detail customer/driver.
- Driver dashboard map.
- Payment/receipt.
- Notifications realtime/push.
- Chat/call sau khi booking co driver.
- Rating sau chuyen.
- Lich su chuyen.

Khong nen tao mot luong rieng tach khoi booking, vi se lam phuc tap bao tri.

## 14. Bug nghiep vu can phong tranh

### 1. Hai customer dung cung mot PIN

Xu ly bang transaction/RPC:

- Khi tao booking, lock session.
- Neu session da matched thi reject.

### 2. Driver tao PIN roi nhan chuyen khac

Khi driver nhan booking thuong:

- Auto cancel Gonow session active.

### 3. Customer nhap PIN het han

RPC tra loi ro:

- `Ma Gonow da het han. Vui long xin tai xe tao ma moi.`

### 4. Driver offline nhung PIN con hien

Khi driver offline:

- Cancel Gonow session active.

### 5. Gia customer thay khac gia booking tao ra

Can dung chung pricing service/RPC.

- Gia preview = gia tao booking.
- Khong tinh lai client-side khac nhau.

### 6. Customer dung Gonow cho dat truoc

MVP nen chan:

- Neu booking mode = scheduled thi an nut Gonow.
- Hoac hien tooltip: `Gonow chi dung cho chuyen di ngay khi ban dang o gan tai xe.`

## 15. Phasing de trien khai

### Phase 1: MVP Gonow PIN

- Tao bang `gonow_sessions`.
- Them `booking_source`, `gonow_session_id` vao `bookings`.
- Tao RPC `create_gonow_session`.
- Tao RPC `verify_gonow_pin`.
- Tao RPC `create_gonow_booking`.
- Customer hien nut Gonow o buoc cuoi booking di ngay.
- Driver tao PIN trong dashboard bottom sheet.
- Booking tao xong vao luong booking detail hien tai.

### Phase 2: Realtime/Push day du

- Driver nhan realtime khi customer ket noi.
- Push notification khi app background.
- Notification click mo dung booking detail.
- Am bao foreground khi co booking Gonow.

### Phase 3: Chong spam va bao mat

- Rate limit verify PIN.
- PIN hash.
- Limit tao PIN moi qua nhanh.
- Audit log session.
- RLS chat hon.

### Phase 4: Toi uu UX tai diem don

- Neu driver/customer o gan nhau, hien goi y `Ban co dang dung gan tai xe nay?`.
- QR code thay cho PIN neu can.
- Customer scan QR de ket noi nhanh hon.

### Phase 5: Bien the tuong lai cho dat truoc voi tai xe quen

Khong phai Gonow MVP.

Co the phat trien tinh nang rieng:

- `Dat truoc voi tai xe da chon`.
- `Driver invite code`.
- `Customer yeu cau tai xe quen`.

Tinh nang nay phai kiem tra lich tai xe, slot trung, thoi gian nghi va dieu kien huy/doi lich.

## 16. Ket luan de xuat

Gonow phu hop voi Daigo neu trien khai nhu mot tuy chon o buoc cuoi cua luong `Di ngay`, sau khi customer da chon diem don/diem den va da co gia uoc tinh.

Khong nen dua Gonow vao `Dat truoc` trong giai doan dau, vi dat truoc la bai toan quan ly lich, khong phai bai toan ket noi tai xe dang o gan ngay luc do.

UI nen giu Gonow gon, la nut phu song song voi `Dat xe ngay`, khong bien thanh tab lon. Driver quan ly Gonow trong dashboard map/bottom sheet bang ma PIN ngan han, sau khi booking duoc tao thi xu ly tiep bang luong chuyen di hien tai.
