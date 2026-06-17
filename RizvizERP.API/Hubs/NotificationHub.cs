using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using RizvizERP.API.Services;

namespace RizvizERP.API.Hubs
{
    public class NotificationHub : Hub
    {
        // ConnectionId → (Username, InterviewName, Role)
        public static readonly ConcurrentDictionary<string, UserConnectionInfo> Connections =
            new ConcurrentDictionary<string, UserConnectionInfo>();

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            string token = httpContext?.Request.Query["access_token"].ToString()
                           ?? httpContext?.Request.Headers["Authorization"].ToString();

            string username = null;
            string interviewName = null;

            if (!string.IsNullOrEmpty(token))
            {
                if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = token.Substring(7);
                }

                if (token.StartsWith("db_jwt_mock_token_key_for_", StringComparison.OrdinalIgnoreCase))
                {
                    username = token.Substring("db_jwt_mock_token_key_for_".Length);
                }
            }

            if (!string.IsNullOrEmpty(username))
            {
                var user = AuthHelper.GetUserByUsername(username);
                if (user != null)
                {
                    interviewName = user.InterviewName?.Trim();
                    Console.WriteLine($"[SignalR] OnConnectedAsync: ConnectionId={Context.ConnectionId} | Username='{username}' | Received interview_name='{interviewName}' from token");
                    
                    if (string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                        Console.WriteLine($"[SignalR] ✅ OnConnectedAsync: Added '{username}' to 'Admins' group [{Context.ConnectionId}]");
                    }
                    else if (!string.IsNullOrEmpty(interviewName))
                    {
                        string lowerGroup = interviewName.ToLowerInvariant();
                        await Groups.AddToGroupAsync(Context.ConnectionId, lowerGroup);
                        Console.WriteLine($"[SignalR] ✅ OnConnectedAsync: Added '{username}' to user group '{lowerGroup}' [{Context.ConnectionId}]");
                    }
                }
            }
            else
            {
                Console.WriteLine($"[SignalR] OnConnectedAsync: ConnectionId={Context.ConnectionId} | No valid mock token found in query or headers.");
            }

            Console.WriteLine($"[SignalR] ⬆ NEW CONNECTION: {Context.ConnectionId} | Origin: {httpContext?.Request.Headers["Origin"]}");
            await base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            Connections.TryRemove(Context.ConnectionId, out var removed);
            if (removed != null)
                Console.WriteLine($"[SignalR] ⬇ DISCONNECTED: {removed.Username} ({removed.Role}) [{Context.ConnectionId}]");
            else
                Console.WriteLine($"[SignalR] ⬇ DISCONNECTED (unregistered): [{Context.ConnectionId}]");
            return base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Called by the frontend immediately after the WebSocket opens.
        /// Stores the user context and adds Admins to the dedicated "Admins" group
        /// so every notification broadcast reaches them regardless of interviewName.
        /// </summary>
        public async Task Register(string username, string interviewName, string role)
        {
            Console.WriteLine($"[SignalR] Register() called — username='{username}' | role='{role}' | interviewName='{interviewName}' | connId={Context.ConnectionId}");

            var info = new UserConnectionInfo
            {
                Username      = username?.Trim(),
                InterviewName = interviewName?.Trim(),
                Role          = role?.Trim()
            };
            Connections[Context.ConnectionId] = info;
            Console.WriteLine($"[SignalR] Total active connections after register: {Connections.Count}");

            // Admins join a persistent SignalR group for reliable group-broadcast delivery
            if (string.Equals(info.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                Console.WriteLine($"[SignalR] ✅ '{username}' → added to 'Admins' group [{Context.ConnectionId}]");
            }
            else if (!string.IsNullOrEmpty(info.InterviewName))
            {
                string lowerGroup = info.InterviewName.ToLowerInvariant();
                await Groups.AddToGroupAsync(Context.ConnectionId, lowerGroup);
                Console.WriteLine($"[SignalR] ✅ '{username}' → added to user group '{lowerGroup}' [{Context.ConnectionId}]");
            }
            else
            {
                Console.WriteLine($"[SignalR] ⚠ '{username}' has NO group assignment (not Admin, no interviewName)");
            }

            Console.WriteLine($"[SignalR] Sending 'Registered=true' back to caller [{Context.ConnectionId}]");
            await Clients.Caller.SendAsync("Registered", true);
            Console.WriteLine($"[SignalR] ✅ Register() complete for '{username}'");
        }

        public async Task JoinGroup(string groupName)
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                Console.WriteLine($"[SignalR] ⚠ JoinGroup called with null or empty groupName from connId={Context.ConnectionId}");
                return;
            }

            var trimmedGroup = groupName.Trim().ToLowerInvariant();
            await Groups.AddToGroupAsync(Context.ConnectionId, trimmedGroup);
            Console.WriteLine($"[SignalR] ✅ Connection {Context.ConnectionId} joined group: '{trimmedGroup}'");
        }
    }

    public class UserConnectionInfo
    {
        public string Username      { get; set; }
        public string InterviewName { get; set; }
        public string Role          { get; set; }
    }
}
