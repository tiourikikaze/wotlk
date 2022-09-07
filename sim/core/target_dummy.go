package core

import (
	"fmt"

	"github.com/wowsims/wotlk/sim/core/proto"
	"github.com/wowsims/wotlk/sim/core/stats"
)

type TargetDummy struct {
	Character
}

func NewTargetDummy(dummyIndex int, party *Party, partyIndex int) *TargetDummy {
	name := fmt.Sprintf("Target Dummy %d", dummyIndex+1)
	td := &TargetDummy{
		Character: Character{
			Unit: Unit{
				Type:        PlayerUnit,
				Index:       int32(party.Index*5 + partyIndex),
				Label:       name,
				Level:       CharacterLevel,
				PseudoStats: stats.NewPseudoStats(),
				auraTracker: newAuraTracker(),
				Metrics:     NewUnitMetrics(),

				StatDependencyManager: stats.NewStatDependencyManager(),
			},
			Name:       name,
			Party:      party,
			PartyIndex: partyIndex,
			baseStats: stats.Stats{
				stats.Health: 10000,
			},
		},
	}

	td.GCD = td.NewTimer()

	return td
}

func (td *TargetDummy) GetCharacter() *Character {
	return &td.Character
}
func (td *TargetDummy) AddRaidBuffs(raidBuffs *proto.RaidBuffs)    {}
func (td *TargetDummy) AddPartyBuffs(partyBuffs *proto.PartyBuffs) {}
func (td *TargetDummy) ApplyGearBonuses()                          {}
func (td *TargetDummy) ApplyTalents()                              {}
func (td *TargetDummy) Initialize()                                {}
func (td *TargetDummy) Reset(sim *Simulation)                      {}
func (td *TargetDummy) OnGCDReady(sim *Simulation) {
	td.DoNothing()
}
func (td *TargetDummy) OnAutoAttack(sim *Simulation, spell *Spell) {}