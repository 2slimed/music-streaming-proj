# Cập Nhật `implementation_plan.md`: Gemini-Grounded Playlist Recommendation

## Summary

Cập nhật hướng triển khai chatbot AI: Gemini là thành phần chính phân tích yêu cầu của người dùng, hiểu bài hát hoặc mood được nhắc tới, sau đó chọn danh sách bài hát gợi ý từ dữ liệu mà hệ thống chuẩn bị. Hệ thống không dùng fallback KNN, không để Gemini bịa bài ngoài app, và không sửa `prisma/schema.prisma`.

Luồng đúng cần là:

1. Người dùng hỏi chatbot về bài hát tương tự hoặc mood.
2. Server tìm seed track hoặc candidate tracks trong database/dataset hiện có.
3. Server gửi seed track và candidate shortlist cho Gemini.
4. Gemini phân tích ngôn ngữ, thể loại, mood, vibe và audio traits rồi trả structured JSON.
5. Server map kết quả Gemini về `Track` trong database.
6. Frontend hiển thị playlist và cho phép tự động lưu playlist vào gallery/library của người dùng.

## Goals

- Dùng Google Gemini API với key đọc từ `.env`, mặc định là `GOOGLE_GENERATIVE_AI_API_KEY`.
- Chatbot phản hồi tự nhiên, đúng ngữ cảnh, ưu tiên tiếng của người dùng.
- Hỗ trợ yêu cầu tìm bài hát tương tự, ví dụ: "tìm bài hát tương tự Comedy của Gen Hoshino".
- Hỗ trợ yêu cầu tìm nhạc theo mood, ví dụ: "tôi muốn tìm các bài hát sôi động".
- Tự động đưa ra danh sách không dưới 20 bài hát nếu database/candidate pool đủ dữ liệu.
- Danh sách gợi ý phải tạo được playlist trong app và lưu được vào gallery/library.
- Không dùng KNN fallback vì cách tính similarity hiện tại không đúng ý.
- Không sửa `prisma/schema.prisma`, không thêm migration.

## Architecture

### Main files

- `src/app/api/chat/route.ts`: API chatbot, gọi Gemini, chuẩn bị candidate list, map kết quả về DB, trả SSE/tool result.
- `src/app/chatbot/page.tsx`: UI chatbot, hiển thị playlist, nút lưu playlist vào library/gallery.
- `src/lib/ai/recommendation.ts`: không dùng KNN làm fallback cho flow này; nếu giữ file thì chỉ nên tách helper đọc candidate hoặc bỏ qua trong plan triển khai.
- `data/dataset.csv`: nguồn bổ sung runtime cho `track_genre` và các audio features chưa có trong Prisma schema.
- `.env`: chứa Gemini API key.

### Constraints

- Không sửa `prisma/schema.prisma`.
- Không đề xuất thêm field như `language`, `normalizedGenre`, `genreConfidence`, hoặc migration mới.
- Database hiện tại chỉ dùng để xác nhận bài hát có tồn tại trong app và có thể thêm vào playlist.
- Dataset CSV có thể được đọc runtime hoặc qua cache/helper riêng, nhưng không thay đổi schema.

## Gemini Flow

### 1. Parse intent

Gemini nhận message người dùng và trả JSON strict:

```json
{
  "intent": "similar_song | mood_search | general_chat",
  "songTitle": "Comedy",
  "artistName": "Gen Hoshino",
  "mood": null,
  "languageHint": null,
  "genreHint": null,
  "count": 20
}
```

Rules:

- `count` tối thiểu là 20.
- Nếu người dùng hỏi bài tương tự, intent là `similar_song`.
- Nếu người dùng hỏi mood/activity như "sôi động", "chill", "buồn", "workout", intent là `mood_search`.
- Nếu không phải yêu cầu recommendation, intent là `general_chat`.

### 2. Find seed track or candidate pool

Với `similar_song`:

- Server tìm seed track trong DB bằng `songTitle + artistName`.
- Nếu tìm được nhiều kết quả, ưu tiên match gần nhất theo title, artist và popularity.
- Lấy metadata hiện có từ DB: title, artists, album, popularity, duration, explicit, danceability, energy.
- Nếu cần thêm context, đọc `data/dataset.csv` để lấy `track_genre`, `tempo`, `valence`, `acousticness`, `instrumentalness`, `speechiness`, hoặc các feature khác nếu có.

Với `mood_search`:

- Server lấy candidate pool đủ lớn từ DB/dataset theo tín hiệu thô:
  - Mood sôi động: ưu tiên `energy` và `danceability` cao.
  - Mood chill: ưu tiên energy vừa/thấp, explicit thấp nếu phù hợp, duration vừa phải.
  - Mood buồn: ưu tiên energy thấp hơn, có thể dùng `valence` từ CSV nếu đọc được.
  - Workout/party: ưu tiên energy cao, danceability cao, popularity tốt.
- Candidate pool chỉ là danh sách cho Gemini chọn, không phải kết quả ranking cuối cùng.

### 3. Gemini selects recommendations

Server gửi Gemini:

- Original user message.
- Parsed intent.
- Seed track nếu có.
- Candidate shortlist từ DB/dataset.
- Cảnh báo rằng `track_genre` từ dataset có thể sai và chỉ là tín hiệu yếu.
- Yêu cầu Gemini chỉ chọn bài từ candidate shortlist, không tự tạo bài hát ngoài danh sách.

Gemini phải trả JSON strict:

```json
{
  "reply": "Mình chọn các bài này vì chúng giữ vibe tiếng Nhật nhẹ, vui và gần màu city-pop/J-pop của Comedy.",
  "playlistName": "Similar to Comedy - Gen Hoshino",
  "recommendations": [
    {
      "trackId": "database-track-id-or-source-id",
      "title": "Song title",
      "artist": "Artist name",
      "reason": "Cùng ngôn ngữ, gần vibe, năng lượng tương tự."
    }
  ]
}
```

Rules:

- `recommendations` phải có ít nhất 20 bài nếu candidate pool đủ.
- Không chọn lại seed track.
- Không chọn bài ngoài candidate shortlist.
- Mỗi item nên có `trackId` nếu server đã gửi `trackId` trong candidate.
- `reason` ngắn, dễ hiểu, không dài dòng.

## Recommendation Priority

Gemini là người quyết định danh sách cuối cùng, nhưng prompt phải khóa thứ tự ưu tiên:

1. **Language first**: ưu tiên bài có cùng ngôn ngữ với seed track hoặc ngôn ngữ người dùng yêu cầu.
2. **Genre second**: ưu tiên cùng hoặc gần thể loại nhạc.
3. **Audio/vibe third**: sau đó mới xét danceability, energy, tempo, valence, acousticness, instrumentalness, speechiness, popularity, duration và cảm giác tổng thể.

Important notes:

- `track_genre` không được coi là nguồn chân lý vì dataset có thể sai.
- Nếu language không có trong DB, Gemini suy luận từ artist/title/album/context và kiến thức âm nhạc của model.
- Nếu genre bị thiếu hoặc không chắc chắn, Gemini dùng vibe, artist context và audio traits để bù.
- Nếu Gemini chọn bài không map được DB, server bỏ qua bài đó hoặc dùng candidate backup mà Gemini đã trả trong JSON nếu có.

## Dataset Handling Without Schema Changes

Không sửa Prisma schema. Thay vào đó:

- Dùng DB hiện tại để lấy các field đã có như `trackName`, `artists`, `albumName`, `popularity`, `durationMs`, `explicit`, `danceability`, `energy`.
- Dùng `data/dataset.csv` như nguồn bổ sung runtime cho:
  - `track_genre`
  - `tempo`
  - `valence`
  - `acousticness`
  - `instrumentalness`
  - `speechiness`
  - `liveness`
- Có thể tạo helper/cache đọc CSV theo `track_id` hoặc theo normalized `trackName + artists` để tránh scan toàn bộ file cho mỗi request.
- Không lưu `language` vào DB. Gemini suy luận language trong prompt.
- Không lưu `normalizedGenre` vào DB. Nếu cần normalize genre, làm trong memory/helper runtime.

Recommended runtime strategy:

- Khi server khởi động hoặc request đầu tiên, load một index nhẹ từ CSV nếu khả thi.
- Nếu full CSV hơn 100k dòng gây nặng, tạo cache JSON local hoặc in-memory map theo `track_id`.
- Candidate list gửi Gemini nên giới hạn hợp lý để tránh vượt context, ví dụ 100-300 tracks tùy model/token budget.
- Mỗi candidate chỉ gửi field cần thiết, không gửi toàn bộ row CSV.

## API Behavior

### `/api/chat`

Expected behavior:

- Nhận message từ frontend.
- Gọi Gemini parse intent.
- Chuẩn bị seed/candidates từ DB + CSV runtime.
- Gọi Gemini chọn playlist từ candidate list.
- Parse JSON Gemini trả về.
- Map các recommendation về `Track` trong DB bằng `trackId`, hoặc fallback nội bộ bằng normalized title + artist matching.
- Trả text response và playlist result cho frontend qua SSE/tool result.

What must be removed from this plan:

- Không dùng `searchPlaylist()` làm KNN fallback.
- Không có nhánh "nếu Gemini lỗi thì chạy KNN".
- Nếu Gemini lỗi hoặc thiếu API key, API nên trả thông báo rõ ràng rằng Gemini hiện không khả dụng, thay vì tự động dùng KNN.

### Error handling

- Nếu thiếu `GOOGLE_GENERATIVE_AI_API_KEY`, trả lỗi thân thiện cho UI: Gemini chưa được cấu hình.
- Nếu seed track không tìm thấy trong app/dataset, hỏi người dùng nhập rõ hơn hoặc gợi ý kiểm tra tên bài/artist.
- Nếu Gemini trả JSON lỗi, retry một lần với prompt sửa JSON.
- Nếu sau mapping còn dưới 20 bài, thông báo số bài match được trong app và không bịa thêm ngoài database.

## Playlist/Gallery Behavior

Frontend cần hỗ trợ:

- Hiển thị danh sách recommendation Gemini trả về.
- Danh sách nên có ít nhất 20 bài nếu server match đủ DB tracks.
- Có nút "Lưu playlist vào thư viện" hoặc tương đương.
- Khi bấm lưu:
  - Gọi `POST /api/playlists` để tạo playlist mới.
  - Gọi `POST /api/playlists/{id}/tracks` cho từng bài đã match DB.
  - Sau khi xong, invalidate `["sidebar-playlists"]` để cột trái/gallery tự refresh.
- Nếu user chưa đăng nhập, hiển thị CTA đăng nhập thay vì fail âm thầm.

Playlist name nên lấy từ Gemini JSON, ví dụ:

- `Similar to Comedy - Gen Hoshino`
- `Nhạc sôi động cho hôm nay`
- `Chill Vietnamese Mix`

## Prompt Requirements

Gemini system prompt phải nhấn mạnh:

- Bạn là music expert trong app nghe nhạc.
- Bạn chỉ được chọn bài từ candidate list hệ thống gửi.
- Bạn phải ưu tiên cùng ngôn ngữ trước, cùng/gần genre sau, rồi mới xét audio traits/vibe.
- `track_genre` có thể sai, hãy coi là tín hiệu yếu.
- Không chọn lại seed track.
- Trả JSON strict, không markdown, không text ngoài JSON.
- Nếu không đủ 20 bài phù hợp, chọn tối đa các bài phù hợp nhất trong candidate list và giải thích ngắn trong `reply`.

## Verification Plan

### Similar song query

Test message:

```text
tìm bài hát tương tự Comedy của Gen Hoshino
```

Expected:

- Server tìm được seed track trong DB/dataset.
- Gemini nhận seed + candidate list.
- Gemini trả ít nhất 20 bài nếu candidate pool đủ.
- Kết quả ưu tiên tiếng Nhật, cùng hoặc gần J-pop/city-pop/vibe vui nhẹ.
- Playlist không chứa lại `Comedy`.
- Playlist trong app chỉ chứa bài match được DB.

### Mood query

Test message:

```text
tôi muốn tìm các bài hát sôi động
```

Expected:

- Gemini hiểu đây là mood/activity search.
- Candidate pool ưu tiên energy/danceability cao.
- Gemini chọn ít nhất 20 bài phù hợp mood.
- Không dùng KNN fallback.

### Save playlist

Expected:

- Bấm lưu playlist tạo playlist mới.
- Toàn bộ track đã match được thêm vào playlist.
- Sidebar/gallery playlist cập nhật tự động qua `["sidebar-playlists"]`.
- Nếu chưa đăng nhập, UI yêu cầu đăng nhập.

### Failure cases

Expected:

- Thiếu Gemini API key: báo Gemini chưa được cấu hình, không chạy KNN.
- Không tìm thấy seed track: yêu cầu người dùng nhập rõ tên bài hoặc artist.
- Gemini trả bài không match DB: bỏ qua bài đó hoặc dùng candidate backup từ JSON, không bịa bài ngoài app.

## Assumptions

- Chỉ sửa `implementation_plan.md`.
- Không sửa `prisma/schema.prisma`.
- Không dùng KNN fallback.
- Gemini không đọc trực tiếp toàn bộ 100k bài; server lọc candidate trước rồi gửi shortlist cho Gemini.
- Database là nguồn xác nhận bài nào có thể phát và lưu playlist trong app.
- CSV dataset là nguồn bổ sung runtime, không phải schema mới.
