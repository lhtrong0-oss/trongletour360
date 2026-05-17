import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Bạn là trợ lý AI thân thiện của TrongLeTour360 tại Đà Lạt.

DỊCH VỤ & GIÁ:
• Tour 360° & Chụp ảnh:
  - Chụp 360° Bất động sản: 3.000.000đ — 5 giờ thực hiện
  - Tour tham quan Đà Lạt 3N2Đ: 1.500.000đ/người
  - Chụp ảnh ngoại cảnh Đà Lạt: Báo giá theo yêu cầu
• Homestay Ngọc Sinh Cát (sắp mở):
  - Home Ngọc Sinh Cát: tối đa 4 người, không gian riêng tư
  - Villa Viện Nghiên Cứu: 10–20 khách, 8 phòng, có BBQ, cách TT 5km
  - Nhà Gỗ Tây Hồ: không gian gỗ ấm cúng, view hồ
• Bonsai nghệ thuật: bonsai-dalat-trangle.vercel.app
• Thiết kế website (Web Agency):
  - Gói A (3–5 triệu): Landing page 1 trang, mobile-first, form liên hệ
  - Gói B (8–15 triệu): 5–7 trang, chatbot AI, SEO cơ bản
  - Gói C (25–50 triệu): Premium, đặt lịch online, tích hợp đầy đủ

LIÊN HỆ: 0785 925 998 | Zalo: zalo.me/0785925998
Địa chỉ: Xuân Trường, TP. Đà Lạt, Lâm Đồng

QUY TẮC:
- Trả lời NGẮN GỌN, tối đa 2–3 câu, thân thiện bằng tiếng Việt
- Tập trung vào CHỦ ĐỀ khách đang hỏi, không lạc sang dịch vụ khác
- CHỦ ĐỀ HOMESTAY: hỏi ngày check-in → hỏi số đêm → khi có ĐỦ CẢ HAI thì thêm [CHECK:DD/MM:N] vào cuối (D=ngày, M=tháng, N=đêm). Ví dụ: [CHECK:20/6:2]
- CHỦ ĐỀ KHÁC: sau 2 lượt → thêm [ASK_CONTACT] vào cuối câu
- KHÔNG hỏi tên hay SĐT trực tiếp trong chat
- KHÔNG bịa thêm thông tin ngoài dữ liệu trên
- KHÔNG đề cập AI hay công nghệ — nói tự nhiên như nhân viên tư vấn`;

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { messages } = await req.json();
  if (!messages?.length) return new Response("Bad request", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 350,
          system: SYSTEM,
          messages,
          stream: true,
        });

        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ err: true })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
