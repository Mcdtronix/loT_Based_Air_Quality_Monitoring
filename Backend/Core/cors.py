from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])

        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        if origin and origin in allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = ", ".join(
                getattr(
                    settings,
                    "CORS_ALLOW_METHODS",
                    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                )
            )
            response["Access-Control-Allow-Headers"] = ", ".join(
                getattr(
                    settings,
                    "CORS_ALLOW_HEADERS",
                    ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
                )
            )
            response["Access-Control-Max-Age"] = "86400"

        return response
