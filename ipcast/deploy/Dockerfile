FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY ipcast/ ./ipcast/
RUN dotnet publish ipcast/src/IPCast.Server/IPCast.Server.csproj -c Release -o /out --no-self-contained

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
USER $APP_UID
EXPOSE 9876/tcp
ENTRYPOINT ["dotnet", "IPCast.Server.dll", "9876"]
