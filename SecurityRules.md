30 security rules for AI VIBE CODING : 

1. Set session expiration (JWT max 7 days + refresh rotation)
2. Never use AI-built auth. Use Clerk, Supabase Auth, or Auth0
3. Never paste API keys into AI chats. Use process.env
4. .gitignore is your first file in every project, not the last
5. Rotate secrets every 90 days minimum
6. Verify every package the AI suggests actually exists before installing
7. Always ask for newer, more secure package versions
8. Run npm audit fix right after building
9. Sanitize every input. Use parameterized queries always
10. Enable Row-Level Security from day one
11. Remove all console.log statements before shipping
12. CORS should only allow your production domain. Never wildcard
13. Validate all redirect URLs against an allow-list
14. Apply auth + rate limits to every endpoint, including mobile APIs
15. Rate limit everything from day one. 100 req/hour per IP is a start
16. Password reset routes get their own strict limit (3 per email/hour)
17. Cap AI API costs in your dashboard AND in your code
18. Add DDoS protection via Cloudflare or Vercel edge config
19. Lock down storage buckets. Users should only access their own files
20. Limit upload sizes and validate file type by signature, not extension
21. Verify webhook signatures before processing any payment data
22. Use Resend or SendGrid with proper SPF/DKIM records
23. Check permissions server-side. UI-level checks are not security
24. Ask the AI to act as a security engineer and review your code
25. Ask the AI to try and hack your app. It will find things you won't
26. Log critical actions: deletions, role changes, payments, exports
27. Build a real account deletion flow. GDPR fines are not fun
28. Automate backups and test restoration. An untested backup is nothing
29. Keep test and production environments completely separate
30. Never let test webhooks touch real systems