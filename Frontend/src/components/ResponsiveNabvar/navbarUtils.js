export const samePageLinkNavigation = (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||                                    
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) return false;
  else return true;
}

                                        
                 
export const pages = [
  { label: "Active",   url: "/dashboard/active",   path: "/dashboard/active" },
  { label: "Finished", url: "/dashboard/finished", path: "/dashboard/finished" },
  { label: "Create",   url: "/dashboard/create",   path: "/dashboard/create" },
  { label: "Models",   url: "/dashboard/models",   path: "/dashboard/models", disabled: true, disabledMsg: "Models page is not available yet" },
  { label: "Admin",    url: "/dashboard/admin",    path: "/dashboard/admin", adminOnly: true },
];

                                                  
export const options = ['Account', 'Notifications', 'Settings', 'Logout'];
