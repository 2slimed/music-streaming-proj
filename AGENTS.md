<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Thông tin dự án MelodyMix & Agent Guidelines
Đây là file lưu ý đặc biệt để các Agent sau nắm bắt kiến trúc và định hướng của dự án MelodyMix.

## 1. Ngôn ngữ thiết kế (Aesthetics)
- Ứng dụng theo phong cách **Soft Dark Theme + Glassmorphism** (Hybrid giữa Apple Music và Spotify). Màu nền cơ bản là `#161618`. Màu nhấn là dải gradient từ hồng sang tím pastel. Mọi viền nổi/Card đều dùng hiệu ứng Backdrop Blur.
- Typography: Sử dụng System Font tiêu chuẩn (`SF Pro` stack), sạch, mỏng.

## 2. Vị trí các components
- `src/components/ui/`: Các element có thể tái sử dụng nhỏ lẻ và UI độc lập: `Button.tsx`, `Typography.tsx`, `GlassWindow.tsx`. Nên sử dụng Class Variance Authority để chia variant.
- `src/components/layout/`: Các thành phần tĩnh bọc Layout lớn: `Sidebar.tsx`, `BottomPlayer.tsx`.
- Không nhồi nhét Layout vào từng page (ví dụ `page.tsx`). Nền tảng là 1 Single Page Application Next.js 15, Sidebar và Player phải được đặt tại `src/app/layout.tsx` để luồng nhạc không bị gãy khi navigate.

## 3. Định hướng cho tương lai (Things to do next)
- **State Management**: Cần setup zustand store (`userStore`, `playerStore`) vì Player component cần truy cập dữ liệu đang chạy toàn cục.
- **API Integration**: Bắt đầu chuẩn bị fetch dữ liệu Next.js từ Spotify Web API hoặc JSON giả. Cần file route handlers cho Next server components.
- **Cấu hình DB**: Lưu trữ schema cho User preferences trên SQLite hoặc Prisma.