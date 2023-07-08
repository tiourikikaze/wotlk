import { Tooltip } from 'bootstrap';

import { EventID, TypedEvent } from '../../typed_event.js';
import { Player } from '../../player.js';
import { ListItemPickerConfig, ListPicker } from '../list_picker.js';
import {
	APLListItem,
	APLAction,
	APLRotation,
} from '../../proto/apl.js';

import { Component } from '../component.js';
import { Input, InputConfig } from '../input.js';
import { ActionId } from '../../proto_utils/action_id.js';
import { SimUI } from '../../sim_ui.js';

import { APLActionPicker } from './apl_actions.js';

export class APLRotationPicker extends Component {
	constructor(parent: HTMLElement, simUI: SimUI, modPlayer: Player<any>) {
		super(parent, 'apl-rotation-picker-root');

		new ListPicker<Player<any>, APLListItem>(this.rootElem, modPlayer, {
			extraCssClasses: ['apl-list-item-picker'],
			title: 'Priority List',
			titleTooltip: 'At each decision point, the simulation will perform the first valid action from this list.',
			itemLabel: 'Action',
			changedEvent: (player: Player<any>) => player.rotationChangeEmitter,
			getValue: (player: Player<any>) => player.aplRotation.priorityList,
			setValue: (eventID: EventID, player: Player<any>, newValue: Array<APLListItem>) => {
                player.aplRotation.priorityList = newValue;
				player.rotationChangeEmitter.emit(eventID);
			},
			newItem: () => APLListItem.create({
				action: {},
			}),
			copyItem: (oldItem: APLListItem) => APLListItem.clone(oldItem),
			newItemPicker: (parent: HTMLElement, listPicker: ListPicker<Player<any>, APLListItem>, index: number, config: ListItemPickerConfig<Player<any>, APLListItem>) => new APLListItemPicker(parent, modPlayer, config, index),
			inlineMenuBar: true,
		});

		//modPlayer.rotationChangeEmitter.on(() => console.log('APL: ' + APLRotation.toJsonString(modPlayer.aplRotation)))
	}
}

class APLListItemPicker extends Input<Player<any>, APLListItem> {
	private readonly player: Player<any>;
	private readonly index: number;

	private readonly hidePicker: Input<Player<any>, boolean>;
	private readonly actionPicker: APLActionPicker;

	private readonly warningsElem: HTMLElement;
	private readonly warningsTooltip: Tooltip;

    private getItem(): APLListItem {
        return this.getSourceValue() || APLListItem.create({
			action: {},
		});
    }

	constructor(parent: HTMLElement, player: Player<any>, config: ListItemPickerConfig<Player<any>, APLListItem>, index: number) {
		config.enableWhen = () => !this.getItem().hide;
		super(parent, 'apl-list-item-picker-root', player, config);
		this.player = player;
		this.index = index;

		const itemHeaderElem = ListPicker.getItemHeaderElem(this);

		this.warningsElem = ListPicker.makeActionElem('apl-warnings', 'Warnings', 'fa-exclamation-triangle');
		this.warningsElem.classList.add('warnings', 'link-warning');
		this.warningsElem.setAttribute('data-bs-html', 'true');
		this.warningsTooltip = Tooltip.getOrCreateInstance(this.warningsElem, {
			customClass: 'dropdown-tooltip',
		});
		itemHeaderElem.appendChild(this.warningsElem);

        this.hidePicker = new HidePicker(itemHeaderElem, player, {
            changedEvent: () => this.player.rotationChangeEmitter,
            getValue: () => this.getItem().hide,
            setValue: (eventID: EventID, player: Player<any>, newValue: boolean) => {
                this.getItem().hide = newValue;
				this.player.rotationChangeEmitter.emit(eventID);
            },
        });

        this.actionPicker = new APLActionPicker(this.rootElem, this.player, {
            changedEvent: () => this.player.rotationChangeEmitter,
            getValue: () => this.getItem().action!,
            setValue: (eventID: EventID, player: Player<any>, newValue: APLAction) => {
                this.getItem().action = newValue;
				this.player.rotationChangeEmitter.emit(eventID);
            },
        });
		this.init();

		this.updateWarnings();
		player.currentStatsEmitter.on(() => this.updateWarnings());
	}

	private async updateWarnings() {
		this.warningsTooltip.setContent({'.tooltip-inner': ''});
		const warnings = this.player.getCurrentStats().rotationStats?.priorityList[this.index]?.warnings || [];
		if (warnings.length == 0) {
			this.warningsElem.style.visibility = 'hidden';
		} else {
			this.warningsElem.style.visibility = 'visible';
			const formattedWarnings = await Promise.all(warnings.map(w => ActionId.replaceAllInString(w)));
			this.warningsTooltip.setContent({'.tooltip-inner': `
				<p>This action has warnings, and might not behave as expected.</p>
				<ul>
					${formattedWarnings.map(w => `<li>${w}</li>`).join('')}
				</ul>
			`});
		}
	}

	getInputElem(): HTMLElement | null {
		return this.rootElem;
	}

    getInputValue(): APLListItem {
        const item = APLListItem.create({
			hide: this.hidePicker.getInputValue(),
			action: this.actionPicker.getInputValue(),
		});
		return item;
    }

	setInputValue(newValue: APLListItem) {
		if (!newValue) {
			return;
		}
		this.hidePicker.setInputValue(newValue.hide);
		this.actionPicker.setInputValue(newValue.action || APLAction.create());
	}
}

class HidePicker extends Input<Player<any>, boolean> {
	private readonly inputElem: HTMLElement;
	private readonly iconElem: HTMLElement;
	private tooltip: Tooltip;

	constructor(parent: HTMLElement, modObject: Player<any>, config: InputConfig<Player<any>, boolean>) {
		super(parent, 'hide-picker-root', modObject, config);

		this.inputElem = ListPicker.makeActionElem('hide-picker-button', 'Enable/Disable', 'fa-eye');
		this.iconElem = this.inputElem.childNodes[0] as HTMLElement;
		this.rootElem.appendChild(this.inputElem);
		this.tooltip = Tooltip.getOrCreateInstance(this.inputElem);

		this.init();

		this.inputElem.addEventListener('click', event => {
			this.setInputValue(!this.getInputValue());
			this.inputChanged(TypedEvent.nextEventID());
		});
	}

	getInputElem(): HTMLElement {
		return this.inputElem;
	}

	getInputValue(): boolean {
		return this.iconElem.classList.contains('fa-eye-slash');
	}

	setInputValue(newValue: boolean) {
		if (newValue) {
			this.iconElem.classList.add('fa-eye-slash');
			this.iconElem.classList.remove('fa-eye');
			this.tooltip.setContent({'.tooltip-inner': 'Enable Action'});
		} else {
			this.iconElem.classList.add('fa-eye');
			this.iconElem.classList.remove('fa-eye-slash');
			this.tooltip.setContent({'.tooltip-inner': 'Disable Action'});
		}
	}
}