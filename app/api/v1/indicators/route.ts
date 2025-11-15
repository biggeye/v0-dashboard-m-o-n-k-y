import { NextResponse } from "next/server"
import { AVAILABLE_INDICATORS } from "@/lib/data/static-metadata"

// ISR: Revalidate every 7 days (604800 seconds)
export const revalidate = 604800

/**
 * GET /api/v1/indicators
 * Returns list of available technical indicators
 * ISR cached for 7 days
 */
export async function GET() {
  try {
    // Convert Record to array format with key included
    const indicators = Object.entries(AVAILABLE_INDICATORS).map(([key, config]) => ({
      id: key,
      name: config.name,
      description: config.description,
      parameters: config.parameters,
      category: config.category,
    }))

    return NextResponse.json({
      data: indicators,
      count: indicators.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching indicators:", error)
    return NextResponse.json(
      { error: "Failed to fetch indicators" },
      { status: 500 }
    )
  }
}

