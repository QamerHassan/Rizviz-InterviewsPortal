# Stage 1 — Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore
COPY RizvizERP.API/RizvizERP.API.csproj RizvizERP.API/
RUN dotnet restore RizvizERP.API/RizvizERP.API.csproj

# Copy everything and publish
COPY RizvizERP.API/ RizvizERP.API/
WORKDIR /src/RizvizERP.API
RUN dotnet publish -c Release -o /app/publish

# Stage 2 — Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published output
COPY --from=build /app/publish .

# Railway sets PORT env variable
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "RizvizERP.API.dll"]
