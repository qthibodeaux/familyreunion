import { SMTPClient } from "https://deno.land/x/smtp/mod.ts";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook payload received:", payload);

    // Extract report details
    // The payload format from Supabase Database Webhook or direct RPC call:
    const record = payload.record || payload;
    if (!record || !record.target_id) {
      return new Response(JSON.stringify({ error: "No valid record found in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "host.docker.internal", // Connects to host machine's Mailpit from Deno Docker container
        port: 1025,
        tls: false,
      },
    });

    await client.send({
      from: "safety-alerts@familyreunion.com",
      to: "admin@familyreunion.com",
      subject: `[Safety Alert] New Content Report: ${record.target_type}`,
      content: `
A new safety report has been submitted on the Family Portal.

Reporter ID: ${record.reporter_id}
Target Type: ${record.target_type}
Target ID: ${record.target_id}
Reason: ${record.reason || "No reason specified"}
Reported At: ${record.created_at || new Date().toISOString()}

Please review the reported content immediately and take necessary moderation actions.
      `,
    });

    console.log("Email notification sent successfully to admin via Mailpit");
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending safety report email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
