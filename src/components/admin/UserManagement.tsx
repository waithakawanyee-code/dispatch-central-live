import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, User, UserPlus, Check, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProfileRole = Database["public"]["Enums"]["profile_role"];

interface Profile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  active: boolean;
  created_at: string;
  email?: string;
}

const ROLE_COLORS: Record<ProfileRole, "default" | "secondary" | "destructive" | "outline"> = {
  ADMIN: "default",
  DISPATCHER: "secondary",
  WASHER: "outline",
  USER: "outline",
};

const ROLE_LABELS: Record<ProfileRole, string> = {
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  WASHER: "Washer",
  USER: "User",
};

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<ProfileRole>("USER");
  const [creating, setCreating] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    
    // Get profiles with user emails via RPC
    const { data: usersData, error: usersError } = await supabase.rpc("get_users_with_roles");
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
    }
    
    // Get all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Failed to load profiles");
      console.error(profilesError);
      setLoading(false);
      return;
    }

    // Merge email data from users with roles
    const emailMap = new Map<string, string>();
    if (usersData) {
      usersData.forEach((u) => {
        emailMap.set(u.user_id, u.email);
      });
    }

    const merged = (profilesData || []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) || undefined,
    }));

    setProfiles(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRoleChange = async (profileId: string, newRole: ProfileRole) => {
    setUpdating(profileId);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profileId);

    if (error) {
      toast.error("Failed to update role");
      console.error(error);
    } else {
      toast.success("Role updated successfully");
      setProfiles(profiles.map((p) =>
        p.id === profileId ? { ...p, role: newRole } : p
      ));
    }
    setUpdating(null);
  };

  const handleActiveToggle = async (profileId: string, active: boolean) => {
    setUpdating(profileId);

    const { error } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", profileId);

    if (error) {
      toast.error("Failed to update status");
      console.error(error);
    } else {
      toast.success(active ? "User activated" : "User deactivated");
      setProfiles(profiles.map((p) =>
        p.id === profileId ? { ...p, active } : p
      ));
    }
    setUpdating(null);
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Email and password are required");
      return;
    }

    setCreating(true);

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUserEmail,
      password: newUserPassword,
      options: {
        data: {
          full_name: newUserName,
        },
      },
    });

    if (authError) {
      toast.error(authError.message);
      setCreating(false);
      return;
    }

    if (!authData.user) {
      toast.error("Failed to create user");
      setCreating(false);
      return;
    }

    // Update the profile with the selected role
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        role: newUserRole,
        full_name: newUserName || null,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Profile might not exist yet due to trigger timing
    }

    toast.success("User created successfully");
    setAddDialogOpen(false);
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserRole("USER");
    setCreating(false);

    // Refresh the list
    setTimeout(fetchProfiles, 1000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user profiles and assign roles. Admins have full access, Dispatchers manage queues, Washers clean vehicles.
            </CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with email and password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(v: ProfileRole) => setNewUserRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
                      <SelectItem value="WASHER">Washer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={creating}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No users found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[150px]">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} className={!profile.active ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{profile.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{profile.email || profile.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[profile.role]}>
                      {ROLE_LABELS[profile.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={profile.active}
                        onCheckedChange={(checked) => handleActiveToggle(profile.id, checked)}
                        disabled={updating === profile.id}
                      />
                      <span className="text-xs text-muted-foreground">
                        {profile.active ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <X className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={profile.role}
                      onValueChange={(value: ProfileRole) => handleRoleChange(profile.id, value)}
                      disabled={updating === profile.id}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
                        <SelectItem value="WASHER">Washer</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
