"use server";

import { query } from "@/lib/db";
import { getClientIp } from "@/lib/client-ip";
import { headers } from "next/headers";

export async function submitCoverageRequest(data: {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
}) {
  try {
    const headersList = await headers();
    const ip = getClientIp(headersList);

    await query(
      `INSERT INTO city_requests (city_name, state, country, location, user_ip)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)`,
      [
        data.city,
        data.state || null,
        data.country,
        data.longitude, // lng is x
        data.latitude, // lat is y
        ip,
      ]
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to submit coverage request:", error);
    return { success: false, error: "Failed to submit request" };
  }
}
