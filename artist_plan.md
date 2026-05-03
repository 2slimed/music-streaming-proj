# Kế hoạch thêm Table Artist và Giao diện Artist Profile

Mục tiêu: Thêm bảng `Artist` vào cơ sở dữ liệu để lưu trữ thông tin chi tiết (bio, ảnh bìa, socials) và tạo trang giao diện hồ sơ nghệ sĩ.

> **Điểm quan trọng cần bạn duyệt:**
> Hiện tại, các bài hát trong DB (`Track`) lưu tên nghệ sĩ dưới dạng chuỗi string cách nhau bởi dấu chấm phẩy (`artists: "Jason Mraz;Colbie Caillat"`). 
> **Lựa chọn thiết kế:** Mình đề xuất giữ nguyên cột `artists` string này để không làm hỏng dữ liệu 114k bài hát cũ, và dùng trường `name` của bảng `Artist` làm khóa chính hoặc phụ để liên kết lỏng (loose coupling). Khi vào trang nghệ sĩ, ta sẽ tìm các bài hát có chứa tên nghệ sĩ đó. Bạn có đồng ý với cách tiếp cận "không phá vỡ" (non-breaking) này không?

## Các thay đổi dự kiến (Proposed Changes)

---

### 1. Database Schema (`prisma/schema.prisma`)
Cập nhật file Prisma schema để thêm bảng mới:

#### [MODIFY] `prisma/schema.prisma`
Thêm model `Artist` như sau:
```prisma
model Artist {
  id        String   @id @default(cuid())
  name      String   @unique
  bio       String?  @db.Text
  imageUrl  String?
  socials   String?  // Lưu JSON string: { "twitter": "...", "instagram": "..." }
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([name])
}
```
*Lưu ý: Dùng `String?` cho `socials` để linh hoạt lưu JSON thay vì kiểu `Json` nghiêm ngặt (hỗ trợ tốt hơn nếu dùng SQLite).*

---

### 2. Database Migration
- Chạy lệnh cập nhật database: `npx prisma db push` (vì dự án đang ở giai đoạn dev).
- Cập nhật Prisma Client: `npx prisma generate`.

---

### 3. Backend API & Dịch vụ lấy dữ liệu
Tạo trang Server Component để lấy dữ liệu nghệ sĩ và các bài hát của họ một cách nhanh nhất.

#### [NEW] `src/app/(user)/artist/[name]/page.tsx`
Tạo trang giao diện Artist Profile:
- Nhận `params.name` (Tên nghệ sĩ từ URL được encode).
- Truy vấn DB tìm Artist: `prisma.artist.findUnique({ where: { name } })`.
- Truy vấn các bài hát của Artist này: `prisma.track.findMany({ where: { artists: { contains: name } } })`.
- Xây dựng UI: Hiển thị Ảnh bìa to, phần Bio giới thiệu, Các nút Social Links, và danh sách các track bên dưới.

---

### 4. Giao diện người dùng (UI)
Cập nhật các liên kết hiện tại trong app để người dùng có thể click vào tên nghệ sĩ.

#### [MODIFY] `src/components/shared/TrackList.tsx` (Hoặc component Player)
- Phân tích chuỗi `artists` (tách theo dấu `;`).
- Biến mỗi tên nghệ sĩ thành một thẻ `<Link>` trỏ về `/artist/[tên_nghệ_sĩ]`.

## Verification Plan

### Kế hoạch kiểm tra
1. Chạy `npx prisma db push` để tạo bảng thành công.
2. Mở Prisma Studio (`npx prisma studio`) và tạo thủ công 1 Artist mẫu (ví dụ: `name: "Jason Mraz"`, thêm ảnh và bio).
3. Truy cập vào đường dẫn `http://localhost:3000/artist/Jason%20Mraz` và kiểm tra UI.
4. Phát một bài hát của Jason Mraz, click vào tên nghệ sĩ trên giao diện Player xem có tự động chuyển hướng sang trang Profile đúng không.
