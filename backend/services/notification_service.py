import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional


class NotificationService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.smtp_host = os.environ.get("SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_pass = os.environ.get("SMTP_PASS", "")

    def check_signal_changes(
        self, symbol: str, new_signal: str, new_score: float
    ) -> Optional[dict]:
        """Compare current signal with last stored signal."""
        result = (
            self.supabase.table("signal_history")
            .select("consolidated_signal")
            .eq("symbol", symbol)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )

        if not result.data:
            return None

        old_signal = result.data[0]["consolidated_signal"]
        if old_signal != new_signal:
            return {
                "symbol": symbol,
                "previous_signal": old_signal,
                "new_signal": new_signal,
            }

        return None

    def create_notifications(
        self,
        symbol: str,
        exchange: str,
        old_signal: str,
        new_signal: str,
        explanation: str,
    ):
        """Create notification records for affected users."""
        # Find users watching this stock with notifications enabled
        result = (
            self.supabase.table("watchlist_entries")
            .select("user_id")
            .eq("symbol", symbol)
            .eq("notifications_enabled", True)
            .execute()
        )

        user_ids = [r["user_id"] for r in (result.data or [])]

        # Also include users with this stock in portfolio
        portfolio_result = (
            self.supabase.table("portfolio_positions")
            .select("user_id")
            .eq("symbol", symbol)
            .execute()
        )

        portfolio_user_ids = [r["user_id"] for r in (portfolio_result.data or [])]
        all_user_ids = list(set(user_ids + portfolio_user_ids))

        # Check each user's notification preferences
        for user_id in all_user_ids:
            profile = (
                self.supabase.table("profiles")
                .select("email, notifications_enabled, notifications_email, notifications_inapp")
                .eq("id", user_id)
                .single()
                .execute()
            )

            if not profile.data or not profile.data.get("notifications_enabled"):
                continue

            prefs = profile.data

            # In-app notification
            if prefs.get("notifications_inapp", True):
                self.supabase.table("notifications").insert(
                    {
                        "user_id": user_id,
                        "symbol": symbol,
                        "exchange": exchange,
                        "type": "consolidated_change",
                        "previous_signal": old_signal,
                        "new_signal": new_signal,
                        "explanation": explanation,
                        "channel": "inapp",
                        "status": "pending",
                    }
                ).execute()

            # Email notification
            if prefs.get("notifications_email", True) and prefs.get("email"):
                self.supabase.table("notifications").insert(
                    {
                        "user_id": user_id,
                        "symbol": symbol,
                        "exchange": exchange,
                        "type": "consolidated_change",
                        "previous_signal": old_signal,
                        "new_signal": new_signal,
                        "explanation": explanation,
                        "channel": "email",
                        "status": "pending",
                    }
                ).execute()

                self.send_email(
                    prefs["email"],
                    symbol,
                    old_signal,
                    new_signal,
                    explanation,
                )

    def send_email(
        self,
        to_email: str,
        symbol: str,
        old_signal: str,
        new_signal: str,
        explanation: str,
    ):
        """Send email notification via SMTP."""
        if not self.smtp_host or not self.smtp_user:
            return  # SMTP not configured

        msg = MIMEMultipart()
        msg["From"] = self.smtp_user
        msg["To"] = to_email
        msg["Subject"] = f"StockSignal: {symbol} signal changed to {new_signal}"

        body = f"""Signal Change Alert

{symbol}: {old_signal} → {new_signal}

{explanation}

View details: http://localhost:3000/stock/{symbol}

---
StockSignal — Technical Analysis for Passive Investors
"""
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
        except Exception:
            pass  # Log but don't fail on email errors
