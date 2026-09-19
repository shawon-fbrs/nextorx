DELETE FROM "ServerSeed" WHERE day = '2026-08-19';
SELECT day, count(*) FROM "ServerSeed" GROUP BY day ORDER BY day;
