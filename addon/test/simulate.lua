-- Simulation hors du jeu : fausses fonctions WoW, exécution de l'addon, puis écriture de
-- InnkeeperSyncDB au format des SavedVariables de WoW. Produit le fichier de test du site.
-- Usage : lua5.1 simulate.lua ../InnkeeperSync/InnkeeperSync.lua > sortie.lua

local roster = {
	{ "Drektar-Forever", "Officier", 1, 42, "Chaman", "Orgrimmar", "", "officier", true, 0, "SHAMAN" },
	{ "Krenna", "Recrue", 4, 17, "Chasseur", "Tarides", "", "", false, 0, "HUNTER" },
	{ "Inconnu", "Recrue", 4, 9, "Démoniste", "Durotar", "", "", false, 0, "WARLOCK" },
}
local offline = { { 0, 0, 0, 0 }, { 0, 0, 3, 5 }, { 0, 1, 2, 0 } }
local tradeskills = {
	{ 164, false, 0, "Forge" },
	{ 164, false, 0, nil, 0, 0, 0, "Drektar-Forever", nil, nil, nil, nil, 150 },
	{ 393, false, 0, "Dépeçage" },
	{ 393, false, 0, nil, 0, 0, 0, "Krenna", nil, nil, nil, nil, 75 },
	{ 165, false, 0, "Travail du cuir" },
	{ 165, false, 0, nil, 0, 0, 0, "Krenna", nil, nil, nil, nil, 60 },
}

local events = {}
function CreateFrame()
	return {
		RegisterEvent = function(_, e) events[#events + 1] = e end,
		SetScript = function(self, _, fn) self.handler = fn; _G.FRAME = self end,
	}
end
function UnitName() return "Drektar" end
function UnitLevel() return 42 end
function UnitClass() return "Chaman", "SHAMAN" end
function UnitRace() return "Troll", "Troll" end
function UnitFactionGroup() return "Horde" end
function GetGuildInfo() return "La Guilde d'Exemple", "Officier" end
function GetServerTime() return 1793500000 end
function GetLocale() return "frFR" end
function IsInGuild() return true end
function GetNumGuildMembers() return #roster end
function GetGuildRosterInfo(i) return unpack(roster[i]) end
function GetGuildRosterLastOnline(i) return unpack(offline[i]) end
function GetNumGuildTradeSkill() return #tradeskills end
function GetGuildTradeSkillInfo(i) return unpack(tradeskills[i]) end
function ExpandGuildTradeSkillHeader() end
function GetProfessions() return 1, nil, nil, 2, nil end
function GetProfessionInfo(i)
	if i == 1 then return "Forge", 0, 150, 225, 0, 0, 164 end
	return "Pêche", 0, 80, 150, 0, 0, 356
end
C_GuildInfo = { GuildRoster = function() end }
C_TradeSkillUI = {
	IsTradeSkillReady = function() return true end,
	IsTradeSkillLinked = function() return false end,
	IsTradeSkillGuild = function() return false end,
	GetBaseProfessionInfo = function() return { professionID = 164, professionName = "Forge", skillLevel = 150 } end,
	GetAllRecipeIDs = function() return { 2662, 2663, 3491 } end,
	GetRecipeInfo = function(id)
		local names = { [2662] = "Ceinture en cuivre", [2663] = "Bracelets en cuivre", [3491] = "Grande hache en bronze" }
		local categories = { [2662] = 2, [2663] = 1, [3491] = 1 }
		return { name = names[id], learned = id ~= 3491, categoryID = categories[id] }
	end,
	GetCategoryInfo = function(id)
		if id == 1 then return { name = "Bracelets", uiOrder = 1 } end
		return { name = "Ceintures", uiOrder = 2 }
	end,
}
SlashCmdList = {}
print = function() end

dofile(arg[1])
for _, e in ipairs({ "PLAYER_LOGIN", "GUILD_ROSTER_UPDATE", "TRADE_SKILL_LIST_UPDATE" }) do FRAME.handler(FRAME, e) end

-- Sérialisation à la manière de WoW (clés entre crochets, « -- [n] » après les éléments de liste).
local out = io.stdout
local function value(v, indent)
	local t = type(v)
	if t == "string" then return ("%q"):format(v) end
	if t == "number" or t == "boolean" then return tostring(v) end
	local lines, n = { "{" }, #v
	for i = 1, n do lines[#lines + 1] = indent .. "\t" .. value(v[i], indent .. "\t") .. ", -- [" .. i .. "]" end
	local keys = {}
	for k in pairs(v) do if type(k) ~= "number" or k > n or k < 1 then keys[#keys + 1] = k end end
	table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
	for _, k in ipairs(keys) do
		local key = type(k) == "string" and ("[%q]"):format(k) or ("[" .. k .. "]")
		lines[#lines + 1] = indent .. "\t" .. key .. " = " .. value(v[k], indent .. "\t") .. ","
	end
	lines[#lines + 1] = indent .. "}"
	return table.concat(lines, "\n")
end
out:write("\nInnkeeperSyncDB = " .. value(InnkeeperSyncDB, "") .. "\n")
